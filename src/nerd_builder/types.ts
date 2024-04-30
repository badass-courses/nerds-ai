import { StructuredTool } from "langchain/tools"
import { NerdWithOutput } from "./output_specifiers/index.js"
import { NerdWithAgent } from "./agent_specifiers/index.js"

export type Platform = "OPEN_AI" | "ANTHROPIC" | "GEMINI"


export type BaseNerd = {
  name: string
  purpose: string
  do_list: string[]
  do_not_list: string[]
  as_tool_description: string
  additional_notes?: string
  tools?: StructuredTool[]
}

export type PreConfiguredNerd<T = string> = NerdWithAgent & NerdWithOutput<T>

export type NerdWithPrompt<T> = PreConfiguredNerd<T> & {
  prompt: string
}

export type InvocableNerd<T> = {
  nerd: NerdWithPrompt<T>,
  invoke: (input: string, runtime_instructions: string) => Promise<T>,
  invoke_raw: (input: string, runtime_instructions: string) => Promise<string>
}

export type Nerd<T = string> = InvocableNerd<T> & {
  as_tool: StructuredTool,
}

export type BaseNerdOptions = {
  name: string
  purpose: string
  do_list: string[]
  do_not_list: string[]
  additional_notes?: string
  as_tool_description: string
  tools?: StructuredTool[]
}