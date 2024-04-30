import { MarkdownSchemaBuilder } from "./index.js"

export const as_string = `Your returned output should be a well-formatted markdown document that includes the following sections:

1. **Introduction**: A brief introduction to the document, including a summary of the source text and the purpose of the document.
2. **Summary**: A summary of the source document, being careful to follow all instructions that you've been given. This section may include the following sub-sections as often as necessary to capture the full argument of the source text.
  2.1 **Key Points**: A list of the key points from the source text, with references to where in the source they appeared.
    2.2 **Implications**: A list of the implications of the source text given the key points you've identified.
    2.3 **Questions**: A list of questions that the source text raises for you.
3. **Conclusions**: Based on your understanding of the text, please highlight any non-obvious implications in the source text.`

export const summary_output_specifier = new MarkdownSchemaBuilder(as_string).build()