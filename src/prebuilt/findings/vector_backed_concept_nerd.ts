import { buildFindingsNerd } from "./index.js"
import { Pinecone } from "@pinecone-database/pinecone"
import { BindableNerd } from "../../nerd_builder/types.js";
import { Findings } from "./wikipedia_research_nerd.js";
import { ConceptToolkit } from "../../tools/pinecone_tools.js"
export { Findings } from "../../nerd_builder/parsers/json/findings.js"

type PineconeConfig = {
  api_key?: string,
  index_name?: string
}

type ConceptNerdConfig = {
  domain: string
}

type ConceptNerdBuilder = (pineconeConfig: PineconeConfig, nerdConfig: ConceptNerdConfig) => BindableNerd<Findings>

export const buildPineconeBackedConceptNerd: ConceptNerdBuilder = (pineconeConfig: PineconeConfig, nerdConfig: ConceptNerdConfig) => {

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

  const toolkit = new ConceptToolkit(pinecone, pinecone_index_name)

  const nerd_opts = {
    name: "VectorBackedConceptStoreNerd",
    purpose: `Your task is to extract 'concepts' from a given text in the domain <${nerdConfig.domain}>. A concept is a term that captures a specific idea or object. This is going to be used to create a searchable index and tooling across a number of technical documents. Our goal is to extract salient concepts from each text, and using the vector store to disambiguate references to different concepts such that they resolve into canonical concept names.`,
    do_list: [
      `1. extract a list of concepts from a given text that are relevant to the domain <${nerdConfig.domain}>`,
      "2. for each extracted concept, you *must* use the `existingConceptFinder` tool to see if there are any existing concepts that could be reused instead. Record your findings in your chain of thought.",
      "3. for each extracted concept that has one or more similar existing concepts you have to carefully make an important decision:",
      "3.1 IF at least one of the similar existing concepts could be used instead of the extracted concept, you MUST replace the extracted concept with that existing concept.",
      "3.2 IF none of the similar existing concepts could be used instead of the extracted concept, or if there are no similar existing concepts, you *MUST* use the extracted concept.",
      "4. Once you have worked through all extracted concepts, identify those extracted concepts that are not already in the store and then you *MUST* add them to the store using the `addConceptsToStore` tool.",
      "5. finally, return your final list of concepts."
    ],
    do_not_list: [
      "forget to use both tools as necessary. Remember, the `existingConceptFinder` tool should be used to find similar concepts in the store, and the `addConceptsToStore` tool should be used to add new concepts to the store.",
      "return any concepts that are not either already in the store or which you have not newly added to the store.",
      "include 'duplicates', in other words if you find a match in the store then you should REPLACE the extracted concept with the store concept."
    ],
    additional_notes: "When passing your list of concepts around be sure to treat them as a JSON array of strings, rather than a single string.",
    as_tool_description: `A tool that extracts tracked, canonical concept names from a given text in the <${nerdConfig.domain}> domain and tracks them in a vector store.`,
    tools: toolkit.getTools()
  }

  return buildFindingsNerd(nerd_opts)
}