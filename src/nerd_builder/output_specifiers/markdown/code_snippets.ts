import { MarkdownSchemaBuilder } from "./index.js"

export const as_string = `Please return a well-formatted, syntactically correct and intelligible snippet of code, wrapped in a codefence as follows.

Use the language requested, or if no language has been requested please infer the language to use from the input text.

Output format:

\`\`\`<language_name>
<your code here>
\`\`\``

export const code_snippet_output_specifier = new MarkdownSchemaBuilder(as_string).build()