import { StructuredTool } from "@langchain/core/tools"
import { AgentSpecifier } from "./agent_specifiers/index.js"
import { NerdOutput, NerdOutputParser } from "./parsers/index.js"
import { ChatPromptTemplate } from "@langchain/core/prompts"

export type Platform = "OPEN_AI" | "ANTHROPIC" | "GEMINI"


export type BaseNerd<T extends NerdOutput> = {
  name: string
  purpose: string
  do_list: string[]
  do_not_list: string[]
  as_tool_description: string
  additional_notes?: string
  tools?: StructuredTool[],
  parser: NerdOutputParser<T>,
  agent_specifier: AgentSpecifier
}

export type NerdWithPrompt<T extends NerdOutput> = BaseNerd<T> & {
  prompt: ChatPromptTemplate
}

export type InvocableNerd<T extends NerdOutput> = {
  nerd: NerdWithPrompt<T>,
  invoke: (input: string, runtime_instructions: string) => Promise<T>,
  invoke_raw: (input: string, runtime_instructions: string) => Promise<string>
}

export type Nerd<T extends NerdOutput = string> = InvocableNerd<T> & {
  tool: StructuredTool,
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

export type BoundNerd<T extends NerdOutput> = {
  name: string,
  with_openai?: Nerd<T>
  with_anthropic?: Nerd<T>
  with_gemini?: Nerd<T>
}