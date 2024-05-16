import { BaseLanguageModelParams } from "langchain/base_language"
import { ModelCost } from "../index.js"
import { AnthropicInput, ChatAnthropic } from "@langchain/anthropic"
import { BaseModel } from "../base_model.js"

export type CLAUDE_3_MODEL = "claude-3-opus-20240229" | "claude-3-sonnet-20240229" | "claude-3-haiku-20240307"
export type CLAUDE_2_MODEL = "claude-2.1" | "claude-2.0"
export type CLAUDE_1_MODEL = "claude-instant-1.2"
export type CLAUDE_MODEL = CLAUDE_3_MODEL | CLAUDE_2_MODEL | CLAUDE_1_MODEL

export type ANTHROPIC_CHAT_OPTIONS = Partial<AnthropicInput> & BaseLanguageModelParams

const CLAUDE_3_CONTEXT_SIZE = 2000000
const CLAUDE_3_CUTOFF = "2023-08-01"
const CLAUDE_3_PRICING: ModelCost = {
  dollars_per_token_in: 0.000015,
  dollars_per_token_out: 0.000075
}

const CLAUDE_2_1_CONTEXT_SIZE = 200000
const CLAUDE_2_0_CONTEXT_SIZE = 100000
const CLAUDE_2_CUTOFF = "2023-02-01"
const CLAUDE_2_PRICING: ModelCost = {
  dollars_per_token_in: 0.000008,
  dollars_per_token_out: 0.000024
}

const CLAUD_1_CONTEXT_SIZE = 100000
const CLAUDE_1_CUTOFF = "2023-02-01"
const CLAUDE_1_PRICING: ModelCost = {
  dollars_per_token_in: 0.0000008,
  dollars_per_token_out: 0.0000024
}

const default_options = {
  temperature: 0
}

export class ClaudeModel extends BaseModel {
  token_limit: number
  cutoff: Date
  cost: ModelCost

  constructor(name: CLAUDE_MODEL, options: ANTHROPIC_CHAT_OPTIONS = null) {
    const opts = options || { default_options, model: name }
    if (opts.model !== name) opts.model = name
    super(name, "ANTHROPIC", new ChatAnthropic(opts))
    switch (name) {
      case "claude-3-opus-20240229":
      case "claude-3-sonnet-20240229":
      case "claude-3-haiku-20240307":
        this.token_limit = CLAUDE_3_CONTEXT_SIZE
        this.cutoff = new Date(CLAUDE_3_CUTOFF)
        this.cost = CLAUDE_3_PRICING
        break
      case "claude-2.1":
        this.token_limit = CLAUDE_2_1_CONTEXT_SIZE
        this.cutoff = new Date(CLAUDE_2_CUTOFF)
        this.cost = CLAUDE_2_PRICING
        break
      case "claude-2.0":
        this.token_limit = CLAUDE_2_0_CONTEXT_SIZE
        this.cutoff = new Date(CLAUDE_2_CUTOFF)
        this.cost = CLAUDE_2_PRICING
        break
      case "claude-instant-1.2":
        this.token_limit = CLAUD_1_CONTEXT_SIZE
        this.cutoff = new Date(CLAUDE_1_CUTOFF)
        this.cost = CLAUDE_1_PRICING
        break
    }
  }
}

export const ANTHROPIC_MODELS_BY_NAME: Record<CLAUDE_MODEL, ClaudeModel> = {
  "claude-3-opus-20240229": new ClaudeModel("claude-3-opus-20240229"),
  "claude-3-sonnet-20240229": new ClaudeModel("claude-3-sonnet-20240229"),
  "claude-3-haiku-20240307": new ClaudeModel("claude-3-haiku-20240307"),

  "claude-2.1": new ClaudeModel("claude-2.1"),
  "claude-2.0": new ClaudeModel("claude-2.0"),

  "claude-instant-1.2": new ClaudeModel("claude-instant-1.2"),
}

export const getModelByName = (name: string): ClaudeModel | undefined => {
  return ANTHROPIC_MODELS_BY_NAME[name]
}