import { NerdOutput } from "../index.js"
import { JsonNerdOutputParser } from "./index.js"

export const schema = `{
  // the "chain_of_thought" array is for tracking your own thoughts as you carry out your task. 
  // Please log your process and observations here as you go, ensuring to keep your thoughts in order.
  // Use these thoughts as you complete your task to help you stay focused.
  "chain_of_thought": string[],

  // Your task is to identify some set of findings. Please return them here as individual strings.
  "findings": string[]
}`

export type Findings = NerdOutput & {
  thoughts: string[],
  findings: string[]
}

export const findings_parser: JsonNerdOutputParser<Findings> = new JsonNerdOutputParser<Findings>(schema)