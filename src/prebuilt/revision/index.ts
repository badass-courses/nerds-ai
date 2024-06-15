import { Nerd } from "../../nerd.js"
import { line_number_inserter } from "../../internals/input_preprocessors/line_number_inserter.js"
import { BaseNerdOptions } from "../../internals/types.js"
import { NerdOutput } from "../../internals/parsers/index.js"
import { JsonNerdOutputParser } from "../../internals/parsers/json/index.js"

const schema = `{
  // the "thought_log" array is for tracking your own thoughts as you carry out your task.
  // Please log your process and observations here as you go, ensuring to keep your thoughts in order.
  // Use these thoughts as you complete your task to help you stay focused.
  "thought_log": string[],

  // return as many proposed edits as you can so long as you are confident that they serve the needs of the operation requested.
  "proposed_edits": [{
    // the line number in the source document where the text you'd like to replace starts. Note that the text should be annotated with an
    // integer followed by a pipe character and a tab. When proposing revisions, please base use these annotations as the basis for your line numbers.
    line_number: number

    // the specific text from the source document that you'd like to replace. this should be identifiable via string matching, it must be exact.
    // note that the text may have been annotated with line numbers at the start of each line - please leave these annotations out of your selection.
    "existing_text": string

    // offer a string of text to replace the selection above. An empty string is a valid value for removal.
    "proposed_replacement": string

    // explain why you are proposing this edit
    "reasoning": string

    // set this to true if there are multiple matches on the issue you're flagging. If so, your "existing_text" should match them all.
    // You may leave this out entirely if it's false.
    "multiple_matches": boolean
  }]
}`

export type ProposedRevisions = NerdOutput & {
  proposed_edits: {
    line_number: number
    existing_text: string
    proposed_replacement: string
    reasoning: string
    multiple_matches?: boolean
    confidence: number
  }[]
}

export const revision_parser: JsonNerdOutputParser<ProposedRevisions> = new JsonNerdOutputParser<ProposedRevisions>(schema)

export class RevisionNerd extends Nerd<string, ProposedRevisions> {
  constructor(nerd_opts: BaseNerdOptions) {
    const preprocessors = nerd_opts.input_preprocessors || []
    preprocessors.push(line_number_inserter)
    nerd_opts.input_preprocessors = preprocessors;
    super(nerd_opts, revision_parser)
  }
}