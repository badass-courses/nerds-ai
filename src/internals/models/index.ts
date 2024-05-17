import { getModelByName as getOpenAIModel, OPENAI_MODEL } from "./openai/index.js"
import { getModelByName as getAnthropicModel, CLAUDE_MODEL } from "./anthropic/index.js"
import { getModelByName as getGoogleModel, GEMINI_MODEL } from "./google/index.js"
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";

export enum Platforms {
  OPEN_AI = "OPEN_AI",
  ANTHROPIC = "ANTHROPIC",
  GOOGLE = "GOOGLE",
  MISTRAL = "MISTRAL",
  OTHER = "OTHER"
}
export type SupportedPlatform = keyof typeof Platforms
export type NerdModelName = OPENAI_MODEL | GEMINI_MODEL | CLAUDE_MODEL

export type ModelCost = {
  dollars_per_token_in: number,
  dollars_per_token_out: number
}
export type NerdModel = {
  name: NerdModelName,
  platform: SupportedPlatform,
  token_limit: number,
  cutoff: Date,
  cost: ModelCost,
  llm: BaseLanguageModelInterface
}

export const getModelByName = (name: NerdModelName): NerdModel => {
  let model: NerdModel = getOpenAIModel(name)
  if (model) return model

  model = getAnthropicModel(name)
  if (model) return model

  model = getGoogleModel(name)
  if (model) return model

  throw new Error(`Model ${name} not found`)
}