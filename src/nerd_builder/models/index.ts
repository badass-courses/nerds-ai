import { ChatAnthropic } from "@langchain/anthropic"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatOpenAI, OpenAI } from "@langchain/openai"
import { ModelType } from "../agent_specifiers/index.js"
import { Runnable } from "langchain/runnables"

const default_gpt_opts = {
  model: "gpt-4-turbo",
  temperature: 0
}

const default_json_gpt_opts = {
  model: "gpt-4-turbo",
  temperature: 0,
  response_format: {
    type: "json_object"
  }
}

const default_claude_opts = {
  model: "claude-3-opus-20240229",
  temperature: 0
}

const default_gemini_opts = {
  model: 'gemini-1.5-pro-latest',
  temperature: 0,
}

export const createChatModel = (nerd, platform, opts): Runnable => {
  if (nerd.agent_specifier.allowed_platforms.indexOf(platform) === -1) {
    throw new Error(`Model platform ${platform} not allowed for this agent`)
  }

  if (platform === "OPEN_AI") {
    const openai_opts = opts || nerd.parser.output_format == "json" ? default_json_gpt_opts : default_gpt_opts
    return nerd.agent_specifier.preferred_model_type === ModelType.LLM ? new OpenAI(opts) : new ChatOpenAI(openai_opts)
  }

  if (platform === "ANTHROPIC") {
    if (nerd.agent_specifier.preferred_model_type === ModelType.LLM) {
      console.warn("Anthropic does not support the LLM model type, defaulting to their Chat model.")
    }
    return new ChatAnthropic(opts || default_claude_opts)
  }

  if (platform === "GEMINI") {
    if (nerd.agent_specifier.preferred_model_type === ModelType.LLM) {
      console.warn("Anthropic does not support the LLM model type, defaulting to their Chat model.")
    }

    return new ChatGoogleGenerativeAI(opts || default_gemini_opts)
  }

  throw new Error(`Model platform ${platform} not supported`)
}