import { NerdWithPrompt, PreConfiguredNerd } from "../types.js";

export class PromptBuilder<T> {
  constructor(public nerd: PreConfiguredNerd<T>) {
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
    if (this.nerd.agent_specific_instructions) {
      return `**Specific Additional Instructions**: 
${this.nerd.agent_specific_instructions}
`
    } else {
      return ""
    }
  }

  specify_runtime_instructions(): string {
    return `You may have additional instructions supplied at query time. If so, they will appear here - but it's okay if none are provided.
{runtime_instructions}
`
  }

  specify_output_instructions(): string {
    return `**Output Instructions**:
${this.nerd.prompt_output_string.replaceAll("{", "{{").replaceAll("}", "}}")}`
  }

  compile_prompt(): string {
    return `${this.specify_identity()}

${this.specify_do_list()}
${this.specify_do_not_list()}
${this.specify_additional_notes()}
${this.specify_agent_instructions()}
${this.specify_runtime_instructions()}
${this.specify_output_instructions()}`.trim()
  }

  decorate(): NerdWithPrompt<T> {
    return {
      ...this.nerd,
      prompt: this.compile_prompt()
    }
  }
}