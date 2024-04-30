import { JsonSchemaBuilder } from "./index.js"

export const as_string = `{

  // the "thoughts" array is for tracking your own thoughts as you carry out your task. Please log your process and observations here as you go.
  "thoughts": string[],

  // note that each proposed edit should be unique, and that means that your 'existing_text' string should occur exactly once in the source text.
  // because this needs to be unique, you can include surrounding text -- for instance, let's say you are suggesting the editor replace "y'all" with "you".
  // the word "y'all" may occur in multiple places - each proposed edit should be specific. So if the context is "I think y'all should..." feel free to propose
  // an edit where the existing text is "think y'all should" and the proposed replacement is "think you should". This helps us to identify which specific "y'all" you're editing.
  "proposed_edits": [{
    // the specific text from the source document that you'd like to replace. this should be identifiable via string matching, it must be exact.
    "existing_text": string

    // offer a string of text to replace the selection above. An empty string is a valid value for removal.
    "proposed_replacement": string

    // explain why you are proposing this edit
    "reasoning": string

    // a value from 0-1 expressing how certain you are that the edit you're proposing is necessary and correct.
    "confidence": number
  }]
}`

export type ProposedRevisions = {
  thoughts: [],
  proposed_edits: {
    existing_text: string
    proposed_replacement: string
    reasoning: string
    confidence: number
  }[]
}

export const revision_output_specifier = new JsonSchemaBuilder<ProposedRevisions>(as_string).build()