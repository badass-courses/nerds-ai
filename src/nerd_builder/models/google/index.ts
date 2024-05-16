import { ChatGoogleGenerativeAI, GoogleGenerativeAIChatInput } from "@langchain/google-genai"
import { ModelCost } from "../index.js"
import { BaseModel } from "../base_model.js"

export type GEMINI_MODEL = "gemini-1.5-pro-latest" | "gemini-1.5-pro" | "gemini-1.5-flash" | "gemini-pro"
export type GOOGLE_CHAT_OPTIONS = Partial<GoogleGenerativeAIChatInput>

const GEMINI_15_PRO_CUTOFF = "2023-07-01"
const GEMINI_15_FLASH_CUTOFF = "2023-07-01"
const GEMINI_1_CUTOFF = "2023-07-01"

// gemini pro charges differently based on the size of the context window, so we'll create two different cost structures
const GEMINI_15_PRO_SMALL_CONTEXT_SIZE = 128000
const GEMINI_15_PRO_PRICING_SMALL: ModelCost = {
  dollars_per_token_in: 0.0000035,
  dollars_per_token_out: 0.0000105
}

const GEMINI_15_PRO_LARGE_CONTEXT_SIZE = 1048576
const GEMINI_15_PRO_PRICING_LARGE: ModelCost = {
  dollars_per_token_in: 0.000007,
  dollars_per_token_out: 0.000021
}

// gemeni flash charges differently based on the size of the context window, so we'll create two different cost structures
const GEMINI_15_FLASH_SMALL_CONTEXT_SIZE = 128000
const GEMINI_15_FLASH_PRICING_SMALL: ModelCost = {
  dollars_per_token_in: 0.00000035,
  dollars_per_token_out: 0.00000053
}

const GEMINI_15_FLASH_LARGE_CONTEXT_SIZE = 1048576
const GEMINI_15_FLASH_PRICING_LARGE: ModelCost = {
  dollars_per_token_in: 0.0000007,
  dollars_per_token_out: 0.00000105
}

const GEMINI_1_PRO_CONTEXT_SIZE = 1048576
const GEMINI_1_PRO_COST: ModelCost = {
  dollars_per_token_in: 0.0000005,
  dollars_per_token_out: 0.0000015
}

const default_options: GOOGLE_CHAT_OPTIONS = {
  temperature: 0
}

export class GoogleChatModel extends BaseModel {
  token_limit: number
  cutoff: Date
  cost: ModelCost
  default_options: GOOGLE_CHAT_OPTIONS

  constructor(name: GEMINI_MODEL, limit_tokens: boolean = false, options: GOOGLE_CHAT_OPTIONS = null) {
    const opts = options || { ...default_options, model: name }
    if (opts.model !== name) opts.model = name
    if (opts.modelName !== name) opts.modelName = name
    super(name, "GOOGLE", new ChatGoogleGenerativeAI(opts))

    switch (name) {
      case "gemini-1.5-pro":
      case "gemini-1.5-pro-latest":
        this.token_limit = limit_tokens ? GEMINI_15_PRO_SMALL_CONTEXT_SIZE : GEMINI_15_PRO_LARGE_CONTEXT_SIZE
        this.cutoff = new Date(GEMINI_15_PRO_CUTOFF)
        this.cost = limit_tokens ? GEMINI_15_PRO_PRICING_SMALL : GEMINI_15_PRO_PRICING_LARGE
        break
      case "gemini-1.5-flash":
        this.token_limit = limit_tokens ? GEMINI_15_FLASH_SMALL_CONTEXT_SIZE : GEMINI_15_FLASH_LARGE_CONTEXT_SIZE
        this.cutoff = new Date(GEMINI_15_FLASH_CUTOFF)
        this.cost = limit_tokens ? GEMINI_15_FLASH_PRICING_SMALL : GEMINI_15_FLASH_PRICING_LARGE
        break
      case "gemini-pro":
        this.token_limit = GEMINI_1_PRO_CONTEXT_SIZE
        this.cutoff = new Date(GEMINI_1_CUTOFF)
        this.cost = GEMINI_1_PRO_COST
        break
    }
  }

  async estimate_prompt_cost(prompt: string): Promise<number> {
    const tokens: number = await (this.llm as ChatGoogleGenerativeAI).getNumTokens(prompt)
    return this.cost.dollars_per_token_in * tokens
  }
}

export const GOOGLE_MODELS_BY_NAME: Record<GEMINI_MODEL, GoogleChatModel> = {
  "gemini-1.5-pro-latest": new GoogleChatModel("gemini-1.5-pro-latest"),
  "gemini-1.5-pro": new GoogleChatModel("gemini-1.5-pro"),
  "gemini-1.5-flash": new GoogleChatModel("gemini-1.5-flash"),
  "gemini-pro": new GoogleChatModel("gemini-pro")
}

export const THROTTLED_GOOGLE_MODELS_BY_NAME: Record<GEMINI_MODEL, GoogleChatModel> = {
  "gemini-1.5-pro-latest": new GoogleChatModel("gemini-1.5-pro-latest", true),
  "gemini-1.5-pro": new GoogleChatModel("gemini-1.5-pro", true),
  "gemini-1.5-flash": new GoogleChatModel("gemini-1.5-flash", true),
  "gemini-pro": new GoogleChatModel("gemini-pro", true)
}

export const getModelByName = (name: string, throttled: boolean = false): GoogleChatModel | undefined => {
  return throttled ? THROTTLED_GOOGLE_MODELS_BY_NAME[name] : GOOGLE_MODELS_BY_NAME[name]
}