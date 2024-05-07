import { ToolInterface } from "@langchain/core/tools";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone, PineconeRecord, QueryResponse, RecordMetadata } from "@pinecone-database/pinecone"
import { Toolkit } from "langchain/agents";
import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

const embeddings = new OpenAIEmbeddings();


export const buildConceptDisambiguationTools = (pinecone: Pinecone, index_name: string = "concepts"): Toolkit => {
  const index = pinecone.index(index_name)
  const getSimilarConcepts = async (concepts: string[]): Promise<Map<string, string[]>> => {
    const embedded_concepts = await embeddings.embedDocuments(concepts)

    const similar_concepts = new Map<string, string[]>()

    for (let i = 0; i < embedded_concepts.length; i++) {
      const concept = concepts[i]
      const embedded_concept = embedded_concepts[i]

      const existing_data: QueryResponse<RecordMetadata> = await index.query({ vector: embedded_concept, topK: 5, includeMetadata: true })
      const matches = existing_data.matches || []

      similar_concepts.set(concept, matches.filter((record) => record.score && record.score < 0.2).map((record) => record.id))
    }

    return similar_concepts
  }

  const upsert_concepts = async (concepts: string[]): Promise<number> => {
    const embedded_concepts = await embeddings.embedDocuments(concepts)

    const records: PineconeRecord[] = []
    for (let i = 0; i < embedded_concepts.length; i++) {
      const concept = concepts[i]
      const embedded_concept = embedded_concepts[i]

      records.push({
        id: concept,
        values: embedded_concept
      })
    }

    await index.upsert(records)
    return records.length
  }

  const tools: ToolInterface[] = [
    new DynamicStructuredTool({
      name: "existingConceptFinder",
      description: "Given some list of concepts, returns a map where each concept passed in is associated with a list of zero or more existing concepts that may be used instead.",
      func: async ({ concepts }): Promise<string> => {
        const similar_concepts = await getSimilarConcepts(concepts)
        return JSON.stringify(similar_concepts)
      },
      schema: z.object({
        concepts: z.array(z.string())
      })
    }),
    new DynamicStructuredTool({
      name: "addConceptsToStore",
      description: "Updates the vector store to include a new list of concepts. Returns the number of concepts added to the store.",
      func: async ({ concepts }): Promise<string> => {
        const records_updated = await upsert_concepts(concepts)
        return JSON.stringify(records_updated)
      },
      schema: z.object({
        concepts: z.array(z.string())
      })
    })
  ]

  return {
    tools,
    getTools: () => tools
  }
}