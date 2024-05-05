import { buildFindingsNerd } from "./index.js"
import { Pinecone } from "@pinecone-database/pinecone"
import { OpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { BoundNerd } from "../../nerd_builder/types.js";
import { Findings } from "./wikipedia_research_nerd.js";
import { VectorStoreInfo, VectorStoreToolkit } from "langchain/agents";
export { Findings } from "../../nerd_builder/parsers/json/findings.js"






type PineconeConfig = {
  api_key?: string,
  index_name?: string
}

type ConceptNerdConfig = {
  domain: string
}

type ConceptNerdBuilder = (pineconeConfig: PineconeConfig, nerdConfig: ConceptNerdConfig) => Promise<BoundNerd<Findings>>

export const buildPineconeNerd: ConceptNerdBuilder = async (pineconeConfig: PineconeConfig, nerdConfig: ConceptNerdConfig) => {

  const pinecone_api_key = pineconeConfig.api_key || process.env.PINECONE_API_KEY
  const pinecone_index_name = pineconeConfig.index_name || process.env.PINECONE_INDEX_NAME

  if (!pinecone_api_key) {
    throw new Error("Pinecone API Key must be provided either as an arg or in your env.")
  }

  if (!pinecone_index_name) {
    throw new Error("Pinecone Index must be provided either as an arg or in your env.")
  }

  const pinecone = new Pinecone({
    apiKey: pinecone_api_key,

  });

  const pinecone_index = pinecone.index(pinecone_index_name);

  const vector_store = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    { pineconeIndex: pinecone_index }
  )

  const vectorStoreInfo: VectorStoreInfo = {
    name: "concepts",
    description: "A store of concept terms that have been used before. When extracting concepts from a text, for each extracted concept see if any similar concepts are in this store and use those if they capture what your target concept is trying to capture. If so, use the existing one; if not, add the one you've got.",
    vectorStore: vector_store
  }

  const toolkit = new VectorStoreToolkit(vectorStoreInfo, new OpenAI({ temperature: 0 }))

  const nerd_opts = {
    name: "VectorBackedConceptStoreNerd",
    purpose: `Your task is to extract 'concepts' from a given text in the domain <${nerdConfig.domain}>. A concept is a term that captures a specific idea or object. This is going to be used to create a searchable index and tooling across a number of technical documents. Our goal is to extract salient concepts from each text, and using the vector store to disambiguate references to different concepts such that they resolve into canonical concept names.`,
    do_list: [
      `extract a list of concepts from a given text that are relevant to the domain <${nerdConfig.domain}>`,
      "use the vector store to resolve references to concepts",
      "use the vector store to find similar concepts to the ones you've extracted",
      "using both the concept list you've extracted and the canonical list of concept names in the vector store, return a list of concepts that capture the document's primary and ancillary themes but be sure to use existing canonical terms if they apply.",
      "add new concepts to the vector store if they are not already present",
      "use your chain_of_thought log to track your initial concept list, how you've updated that concept list against the canonical concept list, and which concepts you've added to the store and which you've resolved to existing concepts."
    ],
    do_not_list: [
      "return any concepts that are not either already in the store or which you have not newly added to the store."
    ],
    as_tool_description: "A tool that extracts canonical and tracked concept names from a given text.",
    tools: toolkit.getTools()
  }

  return await buildFindingsNerd(nerd_opts)
}