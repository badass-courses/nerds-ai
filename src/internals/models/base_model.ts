import { BaseLanguageModelInterface } from "langchain/base_language"
import { ModelCost, NerdModelName, SupportedPlatform } from "./index.js"

export abstract class BaseModel {
  name: NerdModelName
  platform: SupportedPlatform
  llm: BaseLanguageModelInterface

  abstract token_limit: number
  abstract cutoff: Date
  abstract cost: ModelCost

  constructor(name: NerdModelName, platform: SupportedPlatform, llm: BaseLanguageModelInterface) {
    this.name = name
    this.platform = platform
    this.llm = llm
  }

  get_llm(): BaseLanguageModelInterface {
    return this.llm
  }

  async estimate_prompt_cost(prompt: string): Promise<number> {
    const tokens: number = await this.llm.getNumTokens(prompt)
    return tokens * this.cost.dollars_per_token_in
  }
}