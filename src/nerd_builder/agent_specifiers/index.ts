export { buildSimpleAgentSpecifier, SimpleAgentSpecifier } from "./simple/simple_agent_specifier.js"
export { buildReactAgentSpecifier, ReactAgentSpecifier } from "./tool_calling/react_agent_specifier.js"
export { buildToolCallingAgentSpecifier, ToolCallingAgentSpecifier } from "./tool_calling/tool_calling_agent_specifier.js"

import { NerdOutput } from "../parsers/index.js"
import { BaseNerd, Platform } from "../types.js"

export enum AgentType {
  SimpleAgent = "SimpleAgent",
  ToolCallingAgent = "ToolCallingAgent",
  ReactAgent = "ReactAgent",
}

export enum ModelType {
  LLM,
  CHAT
}

export type NO_PROMPT_PATCH = ""

export type AgentSpecifier = {
  agent_type: AgentType,
  agent_specific_instructions?: string,
  preferred_model_type: ModelType,
  allowed_platforms: Platform[],
}

export type NerdWithAgent<T extends NerdOutput = string> = BaseNerd<T> & AgentSpecifier
