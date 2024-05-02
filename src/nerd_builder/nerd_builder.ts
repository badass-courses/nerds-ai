import { AgentSpecifier } from "./agent_specifiers/index.js";
import { NerdPlatformBinder } from "./bindings/index.js";
import { NerdOutput, NerdOutputParser } from "./parsers/index.js";
import { PromptBuilder } from "./prompts/index.js";
import { BaseNerd, BaseNerdOptions, Nerd, NerdWithPrompt, Platform } from "./types.js";

export class NerdBuilder<T extends NerdOutput> {
  bindable_nerd: NerdWithPrompt<T>
  constructor(public parser: NerdOutputParser<T>, public agent_specifier: AgentSpecifier) { }

  build(options: BaseNerdOptions): NerdWithPrompt<T> {
    const nerd: BaseNerd<T> = {
      name: options.name,
      purpose: options.purpose,
      do_list: options.do_list,
      do_not_list: options.do_not_list,
      as_tool_description: options.as_tool_description,
      additional_notes: options.additional_notes,
      tools: options.tools,
      parser: this.parser,
      agent_specifier: this.agent_specifier
    }

    const prompt = new PromptBuilder(nerd).build()
    this.bindable_nerd = {
      ...nerd,
      prompt
    }

    return this.bindable_nerd
  }

  async bindNerd(platform: Platform): Promise<Nerd<T>> {
    if (!this.bindable_nerd) {
      throw new Error("Nerd must be built before binding. Invoke .build(nerd_opts) first.")
    }
    return await new NerdPlatformBinder<T>(this.bindable_nerd).bindToModel(platform)
  }
}

export class NerdBinder<T extends NerdOutput = string> {
  constructor(public nerd: NerdWithPrompt<T>) { }

  async bindToModel(platform: Platform): Promise<Nerd<T>> {
    return await new NerdPlatformBinder<T>(this.nerd).bindToModel(platform)
  }
}