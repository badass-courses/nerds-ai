import { AgentExecutor, createReactAgent, createToolCallingAgent } from "langchain/agents"
import { AgentType } from "../agent_specifiers/index.js"
import { Runnable } from "@langchain/core/runnables"
import { BaseChatModel } from "langchain/chat_models/base"

export const createRunner = async (nerd, llm: BaseChatModel, debug_output: boolean = false): Promise<Runnable> => {
  if (nerd.agent_specifier.agent_type === AgentType.SimpleAgent) {
    return llm
  }

  if (nerd.agent_specifier.agent_type === AgentType.ToolCallingAgent) {
    const tools = nerd.tools
    const prompt = nerd.prompt
    const agent = await createToolCallingAgent({ tools, prompt, llm })
    const executor = new AgentExecutor({ agent, tools, returnIntermediateSteps: debug_output })
    return executor
  }

  if (nerd.agent_specifier.agent_type === AgentType.ReactAgent) {
    const tools = nerd.tools
    const prompt = nerd.prompt
    const agent = await createReactAgent({ tools, prompt, llm })
    return new AgentExecutor({ agent, tools, returnIntermediateSteps: debug_output })
  }

  throw new Error(`Agent type ${nerd.agent_specifier.agent_type} not supported`)
}