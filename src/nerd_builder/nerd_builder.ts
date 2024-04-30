import { AgentSpecifier } from "./agent_specifiers/index.js";
import { NerdPlatformBinder } from "./bindings/index.js";
import { OutputSpecifier } from "./output_specifiers/index.js";
import { PromptBuilder } from "./prompts/index.js";
import { BaseNerd, BaseNerdOptions, Nerd, NerdWithPrompt, Platform, PreConfiguredNerd } from "./types.js";

export class NerdBuilder<T> {
  constructor(public output_specifier: OutputSpecifier<T>, public agent_specifier: AgentSpecifier) { }

  build(options: BaseNerdOptions): NerdWithPrompt<T> {
    const nerd: BaseNerd = {
      name: options.name,
      purpose: options.purpose,
      do_list: options.do_list,
      do_not_list: options.do_not_list,
      as_tool_description: options.as_tool_description,
      additional_notes: options.additional_notes,
      tools: options.tools
    }

    const preconfiguredNerd: PreConfiguredNerd<T> = {
      ...nerd,
      ...this.output_specifier,
      ...this.agent_specifier
    }

    return new PromptBuilder(preconfiguredNerd).decorate()
  }

  async bindNerd(nerd: NerdWithPrompt<T>, platform: Platform): Promise<Nerd<T>> {
    return await new NerdPlatformBinder<T>(nerd).bindToModel(platform)
  }
}

export class NerdBinder<T> {
  constructor(public nerd: NerdWithPrompt<T>) { }

  async bindToModel(platform: Platform): Promise<Nerd<T>> {
    return await new NerdPlatformBinder<T>(this.nerd).bindToModel(platform)
  }
}