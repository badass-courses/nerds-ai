import { CanonicalConceptMapping, CanonicalLabelMapping, ConceptToolInput, GraphData, KnowledgeGraphTools, RelationshipToolInput } from "./knowledge_extraction_nerd.js";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Index, Pinecone, PineconeRecord, QueryResponse, RecordMetadata } from "@pinecone-database/pinecone"

import neo4j from 'neo4j-driver'

const graph_uri = process.env.NEO4J_URI
const graph_user = process.env.NEO4J_USERNAME
const graph_password = process.env.NEO4J_PASSWORD
let driver;

try {
  driver = neo4j.driver(graph_uri, neo4j.auth.basic(graph_user, graph_password))
  const serverInfo = await driver.getServerInfo()
  console.log("Connection to Neo4J Server Established")
  console.log(serverInfo)
} catch (err) {
  console.error("Error connecting to Neo4J", err)
  throw err
}

process.on('exit', async () => {
  await driver.close()
})

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

    const make_safe = (input: string): string => {
      return input.replace(/\s+/g, "_").replace(/-+/g, "_")
    }

    const write_graph = async (input: GraphData): Promise<string> => {
      const query = `MERGE (source:Document {name: "${input.source_id}"})
${input.vertices.map((vertex) => `MERGE (${vertex.id}:${vertex.label} {name: "${vertex.properties.name}"})\nMERGE (source)-[:REFERENCES]->(${vertex.id})`).join("\n")}
${input.edges.map((edge) => `MERGE (${edge.from})-[:${edge.label} {source: "${input.source_id}"}]->(${edge.to})`).join("\n")}
RETURN source.name`;

      console.log(query)

      const session = driver.session()
      try {
        await session.run(query)
        await session.close()
        return "query succeeded : \n" + query
      } catch (e) {
        console.error("Error writing graph data to Neo4J")
        console.dir(e)
        return e.message
      }
    }

    const write_concepts = async (input: ConceptToolInput): Promise<string> => {
      const concept_names = input.proposed_concepts.map((concept) => concept.name)
      const records: PineconeRecord[] = []
      const embedded_concepts = await embeddings.embedDocuments(concept_names)
      for (let i = 0; i < input.proposed_concepts.length; i++) {
        const { name, label } = input.proposed_concepts[i]
        records.push({
          id: name,
          values: embedded_concepts[i],
          metadata: { label }
        })
      }

      await this.concept_index.upsert(records)
      return `Wrote ${records.length} concepts to vector store`
    }

    const write_relationship_labels = async (input: RelationshipToolInput): Promise<string> => {
      const embedded_labels = await embeddings.embedDocuments(input.proposed_relationships)
      const label_records: PineconeRecord[] = []
      for (let i = 0; i < input.proposed_relationships.length; i++) {
        const label = input.proposed_relationships[i]
        label_records.push({
          id: label,
          values: embedded_labels[i]
        })
      }

      await this.relationship_label_index.upsert(label_records)
      return `Wrote ${label_records.length} relationship labels to vector store`
    }

    const writeGraphData = async (input: GraphData): Promise<string> => {
      const result = {
        graph_write: null,
        concept_index_write: null,
        relationship_label_index_write: null
      };

      // we need to make sure that all vertices are unique, so let's filter out any duplicate id's
      const formatted_input = {
        source_id: input.source_id,
        vertices: input.vertices.map((vertex) => {
          return {
            id: "v_" + make_safe(vertex.properties.name),
            label: make_safe(vertex.label),
            properties: vertex.properties
          }
        }).filter((vertex, index, self) => {
          return index === self.findIndex((t) => (t.id === vertex.id))
        }),
        edges: input.edges.map((edge) => {
          const label = make_safe(edge.label)
          const from = "v_" + make_safe(edge.from)
          const to = "v_" + make_safe(edge.to)
          const id = `${from}-${label}->${to}`

          return {
            id,
            label,
            from,
            to,
            properties: edge.properties
          }
        })
      }

      try {
        console.log("Updating graph")
        result.graph_write = write_graph(formatted_input)
      } catch (e) {
        result.graph_write = e.message
        console.log("Error writing graph data to Neo4J", e.stack)
      }

      const concepts = formatted_input.vertices.map((vertex) => { return { name: vertex.properties.name, label: vertex.label } })
      try {
        console.log("writing concepts to vector store")
        result.concept_index_write = await write_concepts({ proposed_concepts: concepts })
      } catch (e) {
        result.concept_index_write = e.message
        console.log("Error writing concepts to vector store", e.stack)
      }


      const relationship_labels = formatted_input.edges.map((edge) => edge.label)
      try {
        console.log("writing relationships to vector store")
        result.relationship_label_index_write = await write_relationship_labels({ proposed_relationships: relationship_labels })
      } catch (e) {
        result.relationship_label_index_write = e.message
        console.log("Error writing relationships to vector store", e.message)
      }


      return JSON.stringify(result)
    }

    super(mapConceptToCanon, mapLabelToCanon, writeGraphData)
    this.concept_index = pinecone.index("concepts")
    this.relationship_label_index = pinecone.index("relationship-labels")
  }

}
