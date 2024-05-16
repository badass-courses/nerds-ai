import { StructuredToolInterface } from "@langchain/core/tools"
import { NerdOutput, NerdOutputParser } from "./nerd_builder/parsers/index.js";
import { BaseNerdOptions, NerdInputPreprocessor, BoundNerd, BindableNerd, BaseNerd } from "./nerd_builder/types.js";
import { NerdModel, NerdModelName, SupportedPlatform, getModelByName } from "./nerd_builder/models/index.js";
import { Runnable, RunnableConfig } from "langchain/runnables";
import { createRunner } from "./nerd_builder/runners/index.js";
import { ChatPromptTemplate } from "langchain/prompts";
import { ReAct_Prompt_Instruction, constructPromptTemplate } from "./nerd_builder/prompts/index.js";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { OutputFixingParser } from "langchain/output_parsers";
import { ChatOpenAI } from "@langchain/openai";
import { apply_preprocessors } from "./nerd_builder/input_preprocessors/index.js";
import { wrapNerdAsTool } from "./tools/index.js";

/**
 * A Nerd is a tool that can be bound to a model and invoked to generate output.
 * The NerdBase class is abstract and is extended by both the exported Nerd class and the private NerdBinding class.
 * The idea is that you can create a Nerd, and then invoke `.bindToModel()` to get a BoundNerd that can be invoked.
 * A single Nerd can be bound to different models, each creating a new BoundNerd, but because both extend from the same
 * abstract base class we can easily track the core nerd properties there.
 * 
 * We have this weird setup because we don't want you to be able to call `new Nerd().bindToModel(model1).bindToModel(model2)` etc.
 * So a nerd is either `bindable` or `bound` but never both.
 */
abstract class NerdBase<T extends NerdOutput> implements BaseNerd<T> {
  name: string
  purpose: string
  do_list: string[]
  do_not_list: string[]
  as_tool_description: string
  parser: NerdOutputParser<T>
  input_preprocessors?: NerdInputPreprocessor[]
  additional_notes?: string
  tools?: StructuredToolInterface[]

  constructor(nerd_config: BaseNerdOptions, output_parser: NerdOutputParser<T>) {
    this.name = nerd_config.name
    this.purpose = nerd_config.purpose
    this.do_list = nerd_config.do_list
    this.do_not_list = nerd_config.do_not_list
    this.as_tool_description = nerd_config.as_tool_description
    this.additional_notes = nerd_config.additional_notes
    this.tools = nerd_config.tools
    this.input_preprocessors = nerd_config.input_preprocessors
    this.parser = output_parser
  }
}

export class Nerd<T extends NerdOutput> extends NerdBase<T> implements BindableNerd<T> {
  constructor(nerd_config: BaseNerdOptions, output_parser: NerdOutputParser<T>) {
    super(nerd_config, output_parser)
  }

  async bindToModel(model: NerdModel | NerdModelName): Promise<BoundNerd<T>> {
    return await (new NerdBinding(this, model)).init()
  }
}

class NerdBinding<T extends NerdOutput> extends NerdBase<T> implements BoundNerd<T> {
  prompt: ChatPromptTemplate
  model: NerdModel
  runner: Runnable

  constructor(public nerd: BaseNerd<T>, model: NerdModel | NerdModelName) {
    super({
      name: nerd.name,
      purpose: nerd.purpose,
      do_list: nerd.do_list,
      do_not_list: nerd.do_not_list,
      as_tool_description: nerd.as_tool_description,
      additional_notes: nerd.additional_notes,
      tools: nerd.tools,
      input_preprocessors: nerd.input_preprocessors
    }, nerd.parser)

    if (typeof model === "string") {
      this.model = getModelByName(model)
    } else {
      this.model = model
    }

    this.prompt = this.construct_prompt()
  }

  private as_tool(): StructuredToolInterface {
    return wrapNerdAsTool(this, this.invoke_raw)
  }

  private construct_prompt(): ChatPromptTemplate {
    // if we're not using tools, cool.
    if (!this.tools || this.tools.length === 0) {
      return constructPromptTemplate(this)
    }

    // if we're using tools, and the model is a chat model that binds tools, cool.
    if (this.model.llm instanceof BaseChatModel && this.model.llm.bindTools) {
      return constructPromptTemplate(this)
    }

    // if we're using tools, but the model doesn't bind tools, we need to include tool names in the prompt for the ReactAgent.
    return constructPromptTemplate(this, ReAct_Prompt_Instruction)
  }

  private async construct_runner(): Promise<Runnable> {
    return await createRunner(this, this.model.llm)
  }

  private getInvocationOpts(platform: SupportedPlatform): Partial<RunnableConfig> {
    const opts = {}
    if (platform === "GOOGLE" && this.parser.output_format === "json") {
      opts['generationConfig'] = { response_mime_type: "application/json" }
    }

    return opts
  }

  async init(): Promise<BoundNerd<T>> {
    this.runner = await this.construct_runner()
    return this
  }

  async invoke(input: string, querytime_instructions: string): Promise<T> {
    const unformatted_result = await this.invoke_raw(input, querytime_instructions)
    const parser = OutputFixingParser.fromLLM(new ChatOpenAI(), this.parser)
    return await parser.parse(unformatted_result) as T
  }

  async invoke_raw(input: string, querytime_instructions: string): Promise<string> {
    if (!this.runner) {
      await this.init()
    }
    const processed_input = await apply_preprocessors(input, this.input_preprocessors || [])
    const result = await this.runner.invoke({
      input: processed_input,
      querytime_instructions,
      format_instructions: this.parser.getFormatInstructions()
    }, this.getInvocationOpts(this.model.platform))

    return ((this.tools?.length > 0) ? result.output : result.content) as string
  }

  get tool(): StructuredToolInterface {
    return this.as_tool()
  }
}