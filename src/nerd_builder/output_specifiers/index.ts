export { MarkdownSchemaBuilder } from './markdown/index.js'
export { JsonSchemaBuilder, JsonSpecifier } from './json/index.js'
export { revision_output_specifier } from './json/revisions.js'
export { summary_output_specifier } from './markdown/summary.js'
export { code_snippet_output_specifier } from './markdown/code_snippets.js'
import { BaseNerd } from '../types.js'

export type SpecifiedNerd<T, O extends OutputSpecifier<T>, N extends BaseNerd> = N & {
  output_specifier: O
}

export type OutputSpecifier<T> = {
  output_format: "json" | "markdown"
  prompt_output_string: string,
  parse: (string) => T
}

export type NerdWithOutput<T = string> = BaseNerd & OutputSpecifier<T>
