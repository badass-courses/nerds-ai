import { Nerd } from "../../nerd.js"
import { BaseNerdOptions } from "../../internals/types.js"
import { NerdOutput } from "../../internals/parsers/index.js"
import { JsonNerdOutputParser } from "../../internals/parsers/json/index.js"

const schema = `{
  // the "thought_log" array is for tracking your own thoughts as you carry out your task.
  // Please log your process and observations here as you go, ensuring to keep your thoughts in order.
  // Use these thoughts as you complete your task to help you stay focused.
  "thought_log": string[],

  // Your task is to identify some set of findings. Please return them here as individual strings.
  "findings": string[]
}`

export type Findings = NerdOutput & {
  findings: string[]
}

export const findings_parser: JsonNerdOutputParser<Findings> = new JsonNerdOutputParser<Findings>(schema)

export class FindingsNerd extends Nerd<Findings> {
  constructor(nerd_opts: BaseNerdOptions) {
    super(nerd_opts, findings_parser)
  }
}