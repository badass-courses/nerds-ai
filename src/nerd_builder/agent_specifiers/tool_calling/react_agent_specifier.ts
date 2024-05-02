import { StructuredTool } from "@langchain/core/tools"
import { AgentSpecifier, AgentType, ModelType } from "../index.js"

export type ReactAgentSpecifier = AgentSpecifier & {
  agent_type: AgentType.ReactAgent,
  tools: StructuredTool[],
  preferred_model_type: ModelType.LLM
}

const REACT_INSTRUCTIONS = `You can use the following tools to help you with this task: {tools}.

As you consider how about to carrying out your task, please stop and think between each step and include your thoughts in the output. 

If the output is a JSON object, you should include your thoughts under the "thoughts" key, which should contain an array of strings where each string is a complete thought.

Please use the following strategy iteratively until you've reached a satisfactory solution:

1. Consider your next step. Is your solution complete? If so, break this loop and return the outcome with your thoughts. If not, please decide on an action to take and log your thoughts about your decision.
2. Choose an action. Remember, while this action may not require one you do have access to the following tools: {tool_names}. Once you've chosen your action, add that thought.
3. Execute the action. If you're using a tool, please include the tool's name in your thoughts.
4. Evaluate the results. If you're happy that the previous action moves you closer to your goal, return to step 1. If you are unhappy with your action, log your reasons as to why, abandon this iteration, and go back to step 1.

Please feel free to use the agent scratchpad to keep track of your thoughts and actions.

{agent_scratchpad}
`

export const buildReactAgentSpecifier = (
  tools: StructuredTool[],
): ReactAgentSpecifier => {
  return {
    agent_type: AgentType.ReactAgent,
    tools,
    agent_specific_instructions: REACT_INSTRUCTIONS,
    allowed_platforms: ["OPEN_AI", "ANTHROPIC"],
    preferred_model_type: ModelType.LLM
  }
}