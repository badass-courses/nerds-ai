import { ChatPromptTemplate } from "@langchain/core/prompts";
import { NerdOutput } from "../parsers/index.js";
import { BaseNerd } from "../types.js";

export class PromptBuilder<T extends NerdOutput> {
  constructor(public nerd: BaseNerd<T>) {
    this.nerd = nerd
  }

  specify_identity(): string {
    return `You are ${this.nerd.name}, a NERD (which is a type of automated LLM-driven assistant). 
    
Your purpose: ${this.nerd.purpose}`
  }

  specify_do_list(): string {
    return `**IMPORTANT** As you carry out your tasks, here is a list of things you should make sure you do:
${this.nerd.do_list.map((item) => `- ${item}`).join("\n")}
`
  }

  specify_do_not_list(): string {
    return `**IMPORTANT** As you carry out your tasks, here is a list of things you should make sure you do not do:
${this.nerd.do_not_list.map((item) => `- ${item}`).join("\n")}
`
  }

  specify_additional_notes(): string {
    if (this.nerd.additional_notes) {
      return `**Additional Notes**:
${this.nerd.additional_notes}
`
    } else {
      return ""
    }
  }

  specify_agent_instructions(): string {
    if (this.nerd.agent_specifier.agent_specific_instructions) {
      return `**Specific Additional Instructions**: 
${this.nerd.agent_specifier.agent_specific_instructions}
`
    } else {
      return ""
    }
  }

  specify_output_instructions(): string {
    return `**Output Instructions**:
{format_instructions}`
  }

  compile_prompt(): string {
    return `${this.specify_identity()}

${this.specify_do_list()}
${this.specify_do_not_list()}
${this.specify_additional_notes()}
${this.specify_agent_instructions()}
${this.specify_output_instructions()}`.trim()
  }

  build(): ChatPromptTemplate {
    return ChatPromptTemplate.fromMessages([
      ["system", this.compile_prompt()],
      ["human", `When invoking your orders against the input in the next message, please add the following constraints to your behavior if anything is specified below:
{querytime_instructions}`],
      ["human", `Please execute your instructions against the following input:
{input}`],
      ["placeholder", "{agent_scratchpad}"]])
  }
}