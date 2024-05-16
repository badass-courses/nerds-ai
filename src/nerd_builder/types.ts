import { StructuredToolInterface } from "@langchain/core/tools"
import { NerdOutput, NerdOutputParser } from "./parsers/index.js"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { NerdModel, NerdModelName } from "./models/index.js"

export type NerdInputPreprocessor = (input: string) => Promise<string>
export type BaseNerdOptions = {
  name: string
  purpose: string
  do_list: string[]
  do_not_list: string[]
  additional_notes?: string
  as_tool_description: string
  tools?: StructuredToolInterface[]
  input_preprocessors?: NerdInputPreprocessor[]
}

export type BaseNerd<T extends NerdOutput> = {
  name: string
  purpose: string
  do_list: string[]
  do_not_list: string[]
  as_tool_description: string
  additional_notes?: string
  tools?: StructuredToolInterface[],
  parser: NerdOutputParser<T>,
  input_preprocessors?: NerdInputPreprocessor[]
}

export type BindableNerd<T extends NerdOutput> = BaseNerd<T> & {
  bindToModel: (model: NerdModel | NerdModelName) => Promise<BoundNerd<T>>
}

export type BoundNerd<T extends NerdOutput> = BaseNerd<T> & {
  prompt: ChatPromptTemplate,
  model: NerdModel,
  invoke: (input: string, runtime_instructions: string) => Promise<T>,
  invoke_raw: (input: string, runtime_instructions: string) => Promise<string>,
  tool: StructuredToolInterface,
}
