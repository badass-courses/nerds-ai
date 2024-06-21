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
  strategy?: string
  additional_notes?: string
  as_tool_description: string
  tools?: StructuredToolInterface[]
  input_preprocessors?: NerdInputPreprocessor[]
}

export type BaseNerd<I extends NerdInput, O extends NerdOutput> = {
  name: string
  purpose: string
  do_list: string[]
  do_not_list: string[]
  strategy?: string
  additional_notes?: string
  as_tool_description: string
  tools?: StructuredToolInterface[],
  parser: NerdOutputParser<O>,
  input_preprocessors?: NerdInputPreprocessor[],
  stringify_input: (input: I, runtime_instructions: string) => Promise<{ input: string, runtime_instructions: string }>,
  postprocess_output: (raw_output: string) => Promise<O>
}

export type BindableNerd<I extends NerdInput, O extends NerdOutput> = BaseNerd<I, O> & {
  bindToModel: (model: NerdModel | NerdModelName) => Promise<BoundNerd<I, O>>
}

export type NerdInput = (Record<string, unknown> | string)

export type BoundNerd<I extends NerdInput, O extends NerdOutput> = BaseNerd<I, O> & {
  prompt: ChatPromptTemplate,
  model: NerdModel,
  invoke: (input: I, runtime_instructions: string) => Promise<O>,
  invoke_raw: (input: string, runtime_instructions: string) => Promise<string>,
  tool: StructuredToolInterface,
}
