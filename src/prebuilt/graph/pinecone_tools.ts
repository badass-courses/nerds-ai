import { CanonicalConceptMapping, CanonicalLabelMapping, ConceptToolInput, ExistingLabels, GraphData, KnowledgeGraphTools, RelationshipToolInput } from "./knowledge_extraction_nerd.js";
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
        const similar_concepts = matches.filter((record) => record.score && record.score > 0.2).map((record) => {
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

        const similar_labels = matches.filter((record) => record.score && record.score > 0.2).map((record) => {
          return record.id as string
        })

        output.push({ label, possible_matches: similar_labels })
      }

      return output
    }

    const make_safe = (input: string): string => {
      return input
        .replace(/[\s\-:+"'<>[\]{}()+=?!,|\\/#&*^%$@`~.]+/g, "_") // replace all specified characters with underscores
        .replace(/_+/g, "_"); // replace multiple underscores with a single underscore

      /* for documentation purposes, the above is intended to replace the below:
      return input
        .replace(/\s+/g, "_") // replace spaces with underscores
        .replace(/-+/g, "_") // replace dashes with underscores
        .replace(/:+/g, "_") // replace colons with underscores
        .replace(/"+/g, "_") // replace quotes with underscores
        .replace(/'+/g, "_") // replace single quotes with underscores
        .replace(/<+/g, "_").replace(/>+/g, "_") // replace angle brackets with underscores
        .replace(/\[+/g, "_").replace(/\]+/g, "_") // replace square brackets with underscores
        .replace(/\{+/g, "_").replace(/\}+/g, "_") // replace curly brackets with underscores
        .replace(/\(+/g, "_").replace(/\)+/g, "_") // replace parentheses with underscores
        .replace(/\++/g, "_") // replace plus signs with underscores
        .replace(/\?+/g, "_") // replace question marks with underscores
        .replace(/!+/g, "_") // replace exclamation points with underscores
        .replace(/,+/g, "_") // replace commas with underscores
        .replace(/\|+/g, "_") // replace pipes with underscores
        .replace(/\\+/g, "_") // replace backslashes with underscores
        .replace(/\//g, "_") // replace forward slashes with underscores
        .replace(/#+/g, "_") // replace hashtags with underscores
        .replace(/&+/g, "_") // replace ampersands with underscores
        .replace(/\*+/g, "_") // replace asterisks with underscores
        .replace(/\^+/g, "_") // replace carets with underscores
        .replace(/%+/g, "_") // replace percent signs with underscores
        .replace(/\$+/g, "_") // replace dollar signs with underscores
        .replace(/@+/g, "_") // replace at signs with underscores
        .replace(/`+/g, "") // remove backticks
        .replace(/~+/g, "") // remove tildes
        .replace(/\.+/g, "_") // replace periods with underscores
        .replace(/_+/g, "_") // replace multiple underscores with a single underscore */
    }

    const write_graph = async (input: GraphData): Promise<string> => {
      const query = `MERGE (source:Document {name: "${input.source_id}"})
${input.vertices.map((vertex) => `MERGE (${vertex.id}:${vertex.label} {name: "${vertex.name}"})\nMERGE (source)-[:REFERENCES]->(${vertex.id})`).join("\n")}
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
        throw e
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
            id: make_safe(vertex.name),
            name: vertex.name,
            label: make_safe(vertex.label),
          }
        }).filter((vertex, index, self) => {
          return index === self.findIndex((t) => (t.name === vertex.name))
        }),
        edges: input.edges.map((edge) => {
          const label = make_safe(edge.label)
          const from = make_safe(edge.from)
          const to = make_safe(edge.to)

          return {
            label,
            from,
            to,
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

      const concepts = formatted_input.vertices
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

    const list_labels = async (): Promise<ExistingLabels> => {
      const session = driver.session()
      const vertex_label_query = `MATCH (n) RETURN DISTINCT labels(n) as labels`
      const edge_label_query = `MATCH ()-[r]->() RETURN DISTINCT type(r) as label`
      try {
        const vertex = await session.run(vertex_label_query)
        const edge = await session.run(edge_label_query)
        await session.close()
        const vertex_labels = vertex.records.map((record) => record.get("labels")).flat().filter((label) => label !== "Document")
        const edge_labels = edge.records.map((record) => record.get("label"))
        return { vertex_labels, edge_labels }
      } catch (e) {
        console.error("Error listing labels in Neo4J")
        console.dir(e)
        throw e
      }

    }

    super(mapConceptToCanon, mapLabelToCanon, writeGraphData, list_labels)
    this.concept_index = pinecone.index("concepts")
    this.relationship_label_index = pinecone.index("relationship-labels")
  }

}