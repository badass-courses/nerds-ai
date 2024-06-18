import 'dotenv/config';
import { KnowledgeExtractionNerd } from "../../src/prebuilt/graph/knowledge_extraction_nerd.js"
import { PineconeKnowledgeGraphTools } from "../../src/prebuilt/graph/pinecone_tools.js"
import { Pinecone } from "@pinecone-database/pinecone"
import { readFileSync, readdirSync } from "fs"
import { inspect } from 'util';
import path from 'path';


const pinecone = new Pinecone()
const pinecone_tools = new PineconeKnowledgeGraphTools(pinecone)
const unbound_nerd = new KnowledgeExtractionNerd(pinecone_tools)

const SOURCE_DIRECTORY = "./sources"
const inputs = readdirSync(SOURCE_DIRECTORY).filter((filename) => {
  return filename.endsWith(".md") && (filename.startsWith("0") || filename.startsWith("1"))
}).map((filename) => {
  const source_path = path.join(SOURCE_DIRECTORY, filename)
  const source_text = readFileSync(source_path, "utf-8")
  return { source_id: filename, source_text }
})

const main = async (): Promise<string[]> => {
  const nerd = await unbound_nerd.bindToModel("gpt-4o")
  const results = []
  for (const input of inputs) {
    console.log(`Processing ${input.source_id}`)
    const result = await nerd.invoke(input, "")
    results.push(`${input.source_id}:\n${inspect(result, false, null, true)}\n`)
  }

  return results
}

main().then((results: string[]) => {
  console.log(results)
})