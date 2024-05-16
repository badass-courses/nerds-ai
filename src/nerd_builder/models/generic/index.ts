import { BaseModel } from "../base_model.js";
import { ModelCost, NerdModelName } from "../index.js";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";

export class GeneralModel extends BaseModel {
  token_limit: number
  cutoff: Date
  cost: ModelCost

  constructor(
    name: NerdModelName,
    runner: BaseLanguageModelInterface,
    token_limit: number,
    cutoff: string,
    cost: ModelCost,
  ) {
    super(name, "OTHER", runner)
    this.token_limit = token_limit
    this.cutoff = new Date(cutoff)
    this.cost = cost
  }
}