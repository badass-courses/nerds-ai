import { CanonicalConceptMapping, CanonicalLabelMapping, ConceptToolInput, GraphData, KnowledgeGraphTools, RelationshipToolInput } from "./knowledge_extraction_nerd.js";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Index, Pinecone, QueryResponse, RecordMetadata } from "@pinecone-database/pinecone"

import { driver, structure } from 'gremlin'

const DriverRemoteConnection = driver.DriverRemoteConnection
const Graph = structure.Graph
const endpoint = process.env.NEBULA_CONNECTION_STRING
const dc = new DriverRemoteConnection(endpoint, {})


const embeddings = new OpenAIEmbeddings();

export class PineconeKnowledgeGraphTools extends KnowledgeGraphTools {
  concept_index: Index
  relationship_label_index: Index

  constructor(public pinecone: Pinecone) {
    // the expectation here is that canonical records will have metadata that includes a label. The "name" of the concept IS the ID.
    const mapConceptToCanon = async (input: ConceptToolInput): Promise<Array<CanonicalConceptMapping>> => {
      const concept_names = input.proposed_concepts.map((concept) => concept.name)
      const embedded_concept_names = await embeddings.embedDocuments(concept_names)
      const output: Array<CanonicalConceptMapping> = []

      for (let i = 0; i < input.proposed_concepts.length; i++) {
        const { name, label } = input.proposed_concepts[i]
        const embedded_concept_name = embedded_concept_names[i]

        const existing_data: QueryResponse<RecordMetadata> = await this.concept_index.query({ vector: embedded_concept_name, topK: 5, includeMetadata: true })
        const matches = existing_data.matches || []

        const similar_concepts = matches.filter((record) => record.score && record.score < 0.2).map((record) => {
          return {
            name: record.id,
            label: record.metadata.label as string
          }
        })
        output.push({ concept: { name, label }, possible_matches: similar_concepts })
      }

      return output;
    }

    const mapLabelToCanon = async (input: RelationshipToolInput): Promise<Array<CanonicalLabelMapping>> => {
      // this is a simpler method, because we're just looking for similar labels. We are going to embed our input labels and then
      // just query the index for similar matches, no metadata involved.
      const embedded_labels = await embeddings.embedDocuments(input.proposed_relationships)
      const output: Array<CanonicalLabelMapping> = []
      for (let i = 0; i < input.proposed_relationships.length; i++) {
        const label = input.proposed_relationships[i]
        const embedded_label = embedded_labels[i]

        const existing_data: QueryResponse<RecordMetadata> = await this.relationship_label_index.query({ vector: embedded_label, topK: 5 })
        const matches = existing_data.matches || []

        const similar_labels = matches.filter((record) => record.score && record.score < 0.2).map((record) => {
          return record.id as string
        })

        output.push({ label, possible_matches: similar_labels })
      }

      return output
    }

    const writeGraphData = async (input: GraphData): Promise<string> => {
      const graph = new Graph()
      const g = graph.traversal().withRemote(dc)
      for (let i = 0; i < input.vertices.length; i++) {
        const vertex = input.vertices[i]
        await g.addV(vertex.label).property('id', vertex.id).property('name', vertex.name).next()
      }

      for (let j = 0; j < input.edges.length; j++) {
        const edge = input.edges[j]
        await g.addEdge(edge.from, edge.to, edge.label).next()
      }

      return "ok"
    }

    super(mapConceptToCanon, mapLabelToCanon, writeGraphData)
    this.concept_index = pinecone.index("concepts")
    this.relationship_label_index = pinecone.index("relationship_labels")
  }

}
