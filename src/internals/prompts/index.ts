import { ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate } from "@langchain/core/prompts";
import { NerdOutput } from "../parsers/index.js";
import { BaseNerd } from "../types.js";

export const constructPromptTemplate = <T extends NerdOutput>(nerd: BaseNerd<any, T>, use_scratchpad: boolean = false, agent_instructions: string = ""): ChatPromptTemplate => {
  const specify_identity = (name: string, purpose: string): string => `You are ${name}, a NERD (which is a type of automated LLM-driven assistant).

Your purpose: ${purpose}
`

  const specify_do_list = (do_list: string[]): string => `**IMPORTANT** As you carry out your tasks, here is a list of things you should make sure you do:
${do_list.map((item) => `- ${item}`).join("\n")}
`

  const specify_do_not_list = (do_not_list: string[]): string => `**IMPORTANT** As you carry out your tasks, here is a list of things you should make sure you do not do:
${do_not_list.map((item) => `- ${item}`).join("\n")}
`
  const specify_strategy = (strategy: string): string => strategy?.length > 0 ? `**Strategy** Please use the following strategy to carry out your task. You should adhere to the steps provided:
${strategy}` : "";

  const specify_additional_notes = (additional_notes: string): string => additional_notes?.length > 0 ? `**Additional Notes**:
${additional_notes}
` : ""

  const specify_agent_instructions = (agent_specific_instructions: string): string => agent_specific_instructions?.length > 0 ? `**Specific Additional Instructions**:
${agent_specific_instructions}
` : ""

  const specify_querytime_instructions = (): string => `**Querytime Instructions**:
{querytime_instructions}
`

  const specify_output_instructions = (): string => `**Output Instructions**:
{format_instructions}
`

  const prompt = `${specify_identity(nerd.name, nerd.purpose)}
${specify_do_list(nerd.do_list)}
${specify_do_not_list(nerd.do_not_list)}
${specify_additional_notes(nerd.additional_notes)}
${specify_strategy(nerd.strategy)}
${specify_agent_instructions(agent_instructions)}
${specify_querytime_instructions()}
${specify_output_instructions()}

Please execute your instructions against the text in the next message.`.trim()

  const systemMessage = SystemMessagePromptTemplate.fromTemplate(prompt);
  const humanMessage = HumanMessagePromptTemplate.fromTemplate("{input}");
  const scratchpadPlaceholder: ["placeholder", "{agent_scratchpad}"] = ["placeholder", "{agent_scratchpad}"]

  if (use_scratchpad)
    return ChatPromptTemplate.fromMessages([systemMessage, humanMessage, scratchpadPlaceholder])
  else {
    return ChatPromptTemplate.fromMessages([systemMessage, humanMessage])
  }
}

export const ReAct_Prompt_Instruction = `You can use the following tools to help you with this task: {tools}.

As you consider how about to carrying out your task, please stop and think between each step and include your thoughts in the output. 

If the output is a JSON object, you should include your thoughts under the "thoughts" key, which should contain an array of strings where each string is a complete thought.

Please use the following strategy iteratively until you've reached a satisfactory solution:

1. Consider your next step. Is your solution complete? If so, break this loop and return the outcome with your thoughts. If not, please decide on an action to take and log your thoughts about your decision.
2. Choose an action. Remember, while this action may not require one you do have access to the following tools: {tool_names}. Once you've chosen your action, add that thought.
3. Execute the action. If you're using a tool, please include the tool's name in your thoughts.
4. Evaluate the results. If you're happy that the previous action moves you closer to your goal, return to step 1. If you are unhappy with your action, log your reasons as to why, abandon this iteration, and go back to step 1.

Please feel free to use the agent scratchpad to keep track of your thoughts and actions.
{agent_scratchpad}

**VERY IMPORTANT NOTE ON OUTPUT FORMAT**
**THIS INSTRUCTION SUPERSEDES OUTPUT FORMAT INSTRUCTIONS** 
Your output format instructions may tell you to output a JSON object. If so, it may instruct you to return output as JSON with no preface or preamble.
But because of the way we are executing this, you **MUST PREFACE YOUR FINAL OUTPUT** with the string "Final Answer:", followed by whatever the described output format instructs.

This is **NOT OPTIONAL**, the parser we are using will fail to understand your output if you do start your response with the string "Final Answer:".`