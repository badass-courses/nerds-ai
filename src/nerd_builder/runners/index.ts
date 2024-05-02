import { AgentExecutor, createReactAgent, createToolCallingAgent } from "langchain/agents"
import { AgentType } from "../agent_specifiers/index.js"
import { Runnable } from "langchain/runnables"

export const createRunner = async (nerd, llm): Promise<Runnable> => {
  if (nerd.agent_specifier.agent_type === AgentType.SimpleAgent) {
    return llm
  }

  if (nerd.agent_specifier.agent_type === AgentType.ToolCallingAgent) {
    const tools = nerd.tools
    const prompt = nerd.prompt
    const agent = await createToolCallingAgent({ tools, prompt, llm })
    return new AgentExecutor({ agent, tools })
  }

  if (nerd.agent_specifier.agent_type === AgentType.ReactAgent) {
    const tools = nerd.tools
    const prompt = nerd.prompt
    const agent = await createReactAgent({ tools, prompt, llm })
    return new AgentExecutor({ agent, tools })
  }

  throw new Error(`Agent type ${nerd.agent_specifier.agent_type} not supported`)
}