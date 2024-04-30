import { OutputSpecifier } from "../index.js"

export type MarkdownSpecifier = OutputSpecifier<string> & {
  output_format: "markdown"
}

export class MarkdownSchemaBuilder {
  constructor(public string_representation: string) { }
  build(): MarkdownSpecifier {
    return {
      output_format: "markdown",
      prompt_output_string: `Please return your output as a Markdown document according to the instructions below.
    
${this.string_representation}`,
      parse: (string) => string
    }
  }
}