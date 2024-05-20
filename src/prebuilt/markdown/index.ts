import { Nerd } from "../../nerd.js"
import { BaseNerdOptions } from "../../internals/types.js"
import { MarkdownNerdOutputParser } from "../../internals/parsers/markdown/index.js"

export const parser: MarkdownNerdOutputParser = new MarkdownNerdOutputParser()

export class MarkdownNerd extends Nerd<string> {
  constructor(nerd_opts: BaseNerdOptions) {
    super(nerd_opts, parser)
  }
}