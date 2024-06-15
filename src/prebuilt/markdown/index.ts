import { Nerd } from "../../nerd.js"
import { BaseNerdOptions } from "../../internals/types.js"
import { MarkdownNerdOutputParser } from "../../internals/parsers/markdown/index.js"

export const default_parser: MarkdownNerdOutputParser = new MarkdownNerdOutputParser()

export class MarkdownNerd extends Nerd<string, string> {
  constructor(nerd_opts: BaseNerdOptions, parser: MarkdownNerdOutputParser = default_parser) {
    super(nerd_opts, parser)
  }
}