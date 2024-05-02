import { NerdOutput } from "../index.js"
import { JsonNerdOutputParser } from "./index.js"

export const schema = `{
  // the "chain_of_thought" array is for tracking your own thoughts as you carry out your task. 
  // Please log your process and observations here as you go, ensuring to keep your thoughts in order.
  // Use these thoughts as you complete your task to help you stay focused.
  "chain_of_thought": string[],

  // return as many proposed edits as you can so long as you are confident that they serve the needs of the operation requested.
  "proposed_edits": [{
    // the line number in the source document where the text you'd like to replace is found.
    line_number: number

    // the specific text from the source document that you'd like to replace. this should be identifiable via string matching, it must be exact.
    "existing_text": string

    // offer a string of text to replace the selection above. An empty string is a valid value for removal.
    "proposed_replacement": string

    // explain why you are proposing this edit
    "reasoning": string

    // set this to true if there are multiple matches on the issue you're flagging. If so, your "existing_text" should match them all.
    "multiple_matches?": boolean

    // a value from 0-1 expressing how certain you are that the edit you're proposing is necessary and correct.
    "confidence": number
  }]
}`

export type ProposedRevisions = NerdOutput & {
  thoughts: [],
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