import { BaseLLMParams } from "langchain/llms/base"
import { ModelCost } from "../index.js"
import { BaseLanguageModelParams } from "langchain/base_language"
import { AzureOpenAIInput, ChatOpenAI, OpenAI, OpenAIChatInput, OpenAIInput } from "@langchain/openai"
import { BaseModel } from "../base_model.js"

export type GPT_4o_MODEL = "gpt-4o" | "gpt-4o-2024-05-13"
export type GPT_4_TURBO_MODEL = "gpt-4-turbo" | "gpt-4-turbo-2024-04-09"
export type GPT_4_MODEL = "gpt-4-0125-preview" | "gpt-4-1106-preview" | "gpt-4-vision-preview" | "gpt-4" | "gpt-4-0613"
export type GPT_4_32K_MODEL = "gpt-4-32k" | "gpt-4-32k-0613"
export type GPT_35_MODEL = "gpt-3.5-turbo" | "gpt-3.5-turbo-0125" | "gpt-3.5-turbo-0613"
export type GPT_35_16K_MODEL = "gpt-3.5-turbo-16k" | "gpt-3.5-turbo-16k-0613"
export type GPT_35_TURBO_INSTRUCT_MODEL = "gpt-3.5-turbo-instruct"

export type OPENAI_MODEL = GPT_4o_MODEL | GPT_4_TURBO_MODEL | GPT_4_MODEL | GPT_4_32K_MODEL | GPT_35_MODEL | GPT_35_16K_MODEL | GPT_35_TURBO_INSTRUCT_MODEL

type OPENAI_LLM_OPTIONS = Partial<OpenAIInput> & Partial<AzureOpenAIInput> & BaseLLMParams
type OPENAI_CHAT_OPTIONS = Partial<OpenAIChatInput> & Partial<AzureOpenAIInput> & BaseLanguageModelParams
export type OPENAI_OPTIONS = OPENAI_LLM_OPTIONS | OPENAI_CHAT_OPTIONS

const GPT_4o_CONTEXT_SIZE = 128000
const GPT_4o_CUTOFF = "2023-10-01"
const GPT_4o_PRICING: ModelCost = {
  dollars_per_token_in: 0.000005,
  dollars_per_token_out: 0.000015
}

const GPT_4_TURBO_CONTEXT_SIZE = 128000
const GPT_4_TURBO_CUTOFF = "2023-4-01"
const GPT_4_TUBO_PRICING: ModelCost = {
  dollars_per_token_in: 0.000010,
  dollars_per_token_out: 0.000030
}

const GPT_4_CONTEXT_SIZE = 8192
const GPT_4_CUTOFF = "2021-09-01"
const GPT_4_PRICING: ModelCost = {
  dollars_per_token_in: 0.000030,
  dollars_per_token_out: 0.000060
}

const GPT_4_32K_CONTEXT_SIZE = 32768
const GPT_4_32K_CUTOFF = "2021-09-01"
const GPT_4_32K_PRICING: ModelCost = {
  dollars_per_token_in: 0.000060,
  dollars_per_token_out: 0.000120
}

const GPT_3_5_TURBO_CONTEXT_SIZE = 16385
const GPT_3_5_TURBO_CUTOFF = "2021-09-01"
const GPT_3_5_TURBO_PRICING: ModelCost = {
  dollars_per_token_in: 0.0000005,
  dollars_per_token_out: 0.0000015
}

const GPT_35_16K_CONTEXT_SIZE = 16385
const GPT_35_16K_CUTOFF = "2021-09-01"
const GPT_35_16K_PRICING: ModelCost = {
  dollars_per_token_in: 0.000003,
  dollars_per_token_out: 0.000004
}

const GPT_3_5_TURBO_INSTRUCT_CONTEXT_SIZE = 4096
const GPT_3_5_TURBO_INSTRUCT_CUTOFF = "2021-09-01"
const GPT_3_5_TURBO_INSTRUCT_PRICING: ModelCost = {
  dollars_per_token_in: 0.0000015,
  dollars_per_token_out: 0.000002
}

const default_options: OPENAI_OPTIONS = {
  temperature: 0
}

export class OpenAILLMModel extends BaseModel {
  token_limit: number
  cutoff: Date
  cost: ModelCost
  default_options: OPENAI_LLM_OPTIONS

  constructor(name: GPT_35_TURBO_INSTRUCT_MODEL, options: OPENAI_LLM_OPTIONS = null) {
    const opts = options || { ...default_options, model: name, modelName: name }
    if (opts.modelName !== name) opts.modelName = name
    if (opts.model !== name) opts.model = name

    super(name, "OPEN_AI", new OpenAI(opts))

    this.token_limit = GPT_3_5_TURBO_INSTRUCT_CONTEXT_SIZE
    this.cutoff = new Date(GPT_3_5_TURBO_INSTRUCT_CUTOFF)
    this.cost = GPT_3_5_TURBO_INSTRUCT_PRICING
  }
}

export class OpenAIChatModel extends BaseModel {
  token_limit: number
  cutoff: Date
  cost: ModelCost
  default_options: OPENAI_CHAT_OPTIONS

  constructor(name: OPENAI_MODEL, options: OPENAI_CHAT_OPTIONS = null) {
    const opts = options || { ...default_options, model: name, modelName: name }
    if (opts.modelName !== name) opts.modelName = name
    if (opts.model !== name) opts.model = name

    super(name, "OPEN_AI", new ChatOpenAI(opts))

    switch (name) {
      case "gpt-4o":
      case "gpt-4o-2024-05-13":
        this.token_limit = GPT_4o_CONTEXT_SIZE
        this.cutoff = new Date(GPT_4o_CUTOFF)
        this.cost = GPT_4o_PRICING
        break
      case "gpt-4-turbo":
      case "gpt-4-turbo-2024-04-09":
        this.token_limit = GPT_4_TURBO_CONTEXT_SIZE
        this.cutoff = new Date(GPT_4_TURBO_CUTOFF)
        this.cost = GPT_4_TUBO_PRICING
        break
      case "gpt-4":
      case "gpt-4-0613":
        this.token_limit = GPT_4_CONTEXT_SIZE
        this.cutoff = new Date(GPT_4_CUTOFF)
        this.cost = GPT_4_PRICING
        break
      case "gpt-4-32k":
      case "gpt-4-32k-0613":
        this.token_limit = GPT_4_32K_CONTEXT_SIZE
        this.cutoff = new Date(GPT_4_32K_CUTOFF)
        this.cost = GPT_4_32K_PRICING
        break
      case "gpt-3.5-turbo-0125":
      case "gpt-3.5-turbo":
      case "gpt-3.5-turbo-0613":
      case "gpt-3.5-turbo-16k-0613":
        this.token_limit = GPT_3_5_TURBO_CONTEXT_SIZE
        this.cutoff = new Date(GPT_3_5_TURBO_CUTOFF)
        this.cost = GPT_3_5_TURBO_PRICING
        break
      case "gpt-3.5-turbo-instruct":
        this.token_limit = GPT_3_5_TURBO_INSTRUCT_CONTEXT_SIZE
        this.cutoff = new Date(GPT_3_5_TURBO_INSTRUCT_CUTOFF)
        this.cost = GPT_3_5_TURBO_INSTRUCT_PRICING
        break
      case "gpt-3.5-turbo-16k":
        this.token_limit = GPT_35_16K_CONTEXT_SIZE
        this.cutoff = new Date(GPT_35_16K_CUTOFF)
        this.cost = GPT_35_16K_PRICING
        break
    }
  }
}


export const OPEN_AI_MODELS_BY_NAME: Record<OPENAI_MODEL, OpenAIChatModel | OpenAILLMModel> = {
  "gpt-4o": new OpenAIChatModel("gpt-4o"),
  "gpt-4o-2024-05-13": new OpenAIChatModel("gpt-4o-2024-05-13"),
  "gpt-4-turbo": new OpenAIChatModel("gpt-4-turbo"),
  "gpt-4-turbo-2024-04-09": new OpenAIChatModel("gpt-4-turbo-2024-04-09"),
  "gpt-4": new OpenAIChatModel("gpt-4"),
  "gpt-4-0125-preview": new OpenAIChatModel("gpt-4-0125-preview"),
  "gpt-4-1106-preview": new OpenAIChatModel("gpt-4-1106-preview"),
  "gpt-4-vision-preview": new OpenAIChatModel("gpt-4-vision-preview"),
  "gpt-4-0613": new OpenAIChatModel("gpt-4-0613"),
  "gpt-4-32k": new OpenAIChatModel("gpt-4-32k"),
  "gpt-4-32k-0613": new OpenAIChatModel("gpt-4-32k-0613"),
  "gpt-3.5-turbo-0125": new OpenAIChatModel("gpt-3.5-turbo-0125"),
  "gpt-3.5-turbo": new OpenAIChatModel("gpt-3.5-turbo"),
  "gpt-3.5-turbo-0613": new OpenAIChatModel("gpt-3.5-turbo-0613"),
  "gpt-3.5-turbo-16k": new OpenAIChatModel("gpt-3.5-turbo-16k"),
  "gpt-3.5-turbo-16k-0613": new OpenAIChatModel("gpt-3.5-turbo-16k-0613"),
  "gpt-3.5-turbo-instruct": new OpenAIChatModel("gpt-3.5-turbo-instruct"),
}

export const getModelByName = (name: string): OpenAIChatModel | OpenAILLMModel | undefined => {
  return OPEN_AI_MODELS_BY_NAME[name]
}