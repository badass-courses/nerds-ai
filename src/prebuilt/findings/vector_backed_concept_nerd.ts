import { buildFindingsNerd } from "./index.js"
import { Pinecone } from "@pinecone-database/pinecone"
import { BoundNerd } from "../../nerd_builder/types.js";
import { Findings } from "./wikipedia_research_nerd.js";
import { buildConceptDisambiguationTools } from "../../tools/pinecone_tools.js"
export { Findings } from "../../nerd_builder/parsers/json/findings.js"

type PineconeConfig = {
  api_key?: string,
  index_name?: string
}

type ConceptNerdConfig = {
  domain: string
}

type ConceptNerdBuilder = (pineconeConfig: PineconeConfig, nerdConfig: ConceptNerdConfig) => Promise<BoundNerd<Findings>>

export const buildPineconeBackedConceptNerd: ConceptNerdBuilder = async (pineconeConfig: PineconeConfig, nerdConfig: ConceptNerdConfig) => {

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

  const toolkit = buildConceptDisambiguationTools(pinecone, pinecone_index_name)

  const nerd_opts = {
    name: "VectorBackedConceptStoreNerd",
    purpose: `Your task is to extract 'concepts' from a given text in the domain <${nerdConfig.domain}>. A concept is a term that captures a specific idea or object. This is going to be used to create a searchable index and tooling across a number of technical documents. Our goal is to extract salient concepts from each text, and using the vector store to disambiguate references to different concepts such that they resolve into canonical concept names.`,
    do_list: [
      `1. extract a list of concepts from a given text that are relevant to the domain <${nerdConfig.domain}>`,
      "2. for each extracted concept, use the `existingConceptFinder` tool to see if there are any existing concepts that could be reused instead. Record your findings in your chain of thought.",
      "3. for each extracted concept, either replace it with an existing concept (if this can be done while preserving overall meaning) or keep track of it as a NEW CONCEPT to write to the store. Record your decision in your chain of thought.",
      "4. using the `upsert_concepts` tool, write any new concepts to the store. Record the number of new concepts written in your chain of thought.",
      "5. finally, return your final list of concepts."
    ],
    do_not_list: [
      "return any concepts that are not either already in the store or which you have not newly added to the store.",
      "include 'duplicates', in other words if you find a match in the store then you should REPLACE the extracted concept with the store concept."
    ],
    as_tool_description: `A tool that extracts tracked, canonical concept names from a given text in the <${nerdConfig.domain}> domain and tracks them in a vector store.`,
    tools: toolkit.getTools()
  }

  return await buildFindingsNerd(nerd_opts)
}