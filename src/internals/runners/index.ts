import { AgentExecutor, createReactAgent, createToolCallingAgent } from "langchain/agents"
import { Runnable } from "@langchain/core/runnables"
import { BaseChatModel } from "@langchain/core/language_models/chat_models"
import { BoundNerd } from "../types.js"
import { NerdOutput } from "../parsers/index.js"
import { BaseLanguageModelInterface } from "langchain/base_language"
import { StructuredToolInterface } from "@langchain/core/tools"
import { ChatPromptTemplate } from "langchain/prompts"

export const createRunner = async (nerd: BoundNerd<NerdOutput>, llm: BaseChatModel | BaseLanguageModelInterface): Promise<Runnable> => {
  if (!nerd.tools || nerd.tools.length === 0) {
    return nerd.prompt.pipe(llm)
  }

  const tools = nerd.tools
  const prompt = nerd.prompt
  const agent = await createAgent(tools, prompt, llm)
  return new AgentExecutor({ agent, tools })
}

const createAgent = async (tools: StructuredToolInterface[], prompt: ChatPromptTemplate, llm: BaseChatModel | BaseLanguageModelInterface): Promise<Runnable> => {
  if (llm instanceof BaseChatModel && llm.bindTools) {
    return await createToolCallingAgent({ tools, prompt, llm })
  } else {
    return await createReactAgent({ tools, prompt, llm })
  }
}