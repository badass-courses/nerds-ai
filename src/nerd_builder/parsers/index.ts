import { BaseOutputParser } from '@langchain/core/output_parsers';

export type NerdOutput = string | {
  chain_of_thought: string[]
}

export type NerdOutputType = "string" | "json"

export abstract class NerdOutputParser<T extends NerdOutput> extends BaseOutputParser<T> {
  lc_namespace = ["langchain", "output_parsers"]
  output_format: NerdOutputType = "string"
  constructor(output_format: NerdOutputType = "string") {
    super({ output_format });
    this.output_format = output_format
  }

  abstract parse(output: string): Promise<T>
}