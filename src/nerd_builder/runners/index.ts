import { AgentExecutor, createReactAgent, createToolCallingAgent } from "langchain/agents"
import { AgentType } from "../agent_specifiers/index.js"
import { Runnable } from "@langchain/core/runnables"
import { BaseChatModel } from "langchain/chat_models/base"
import { BindableNerd } from "../types.js"
import { NerdOutput } from "../parsers/index.js"

export const createRunner = async (nerd: BindableNerd<NerdOutput>, llm: BaseChatModel): Promise<Runnable> => {
  let output;

  if (nerd.agent_specifier.agent_type === AgentType.SimpleAgent) {
    output = nerd.prompt.pipe(llm)
  }

  if (nerd.agent_specifier.agent_type === AgentType.ToolCallingAgent) {
    const tools = nerd.tools
    const prompt = nerd.prompt
    const agent = await createToolCallingAgent({ tools, prompt, llm })
    const executor = new AgentExecutor({ agent, tools })
    output = executor;
  }

  if (nerd.agent_specifier.agent_type === AgentType.ReactAgent) {
    const tools = nerd.tools
    const prompt = nerd.prompt
    const agent = await createReactAgent({ tools, prompt, llm })
    const executor = new AgentExecutor({ agent, tools })
    output = executor;
  }

  return output;
}