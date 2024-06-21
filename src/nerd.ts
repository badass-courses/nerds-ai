import { StructuredToolInterface } from "@langchain/core/tools"
import { NerdOutput, NerdOutputParser } from "./internals/parsers/index.js";
import { BaseNerdOptions, NerdInputPreprocessor, BoundNerd, BindableNerd, BaseNerd, NerdInput } from "./internals/types.js";
import { NerdModel, NerdModelName, SupportedPlatform, getModelByName } from "./internals/models/index.js";
import { Runnable, RunnableConfig } from "langchain/runnables";
import { createRunner } from "./internals/runners/index.js";
import { ChatPromptTemplate } from "langchain/prompts";
import { ReAct_Prompt_Instruction, constructPromptTemplate } from "./internals/prompts/index.js";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { OutputFixingParser } from "langchain/output_parsers";
import { ChatOpenAI } from "@langchain/openai";
import { apply_preprocessors } from "./internals/input_preprocessors/index.js";
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
abstract class NerdBase<I extends NerdInput, O extends NerdOutput> implements BaseNerd<I, O> {
  name: string
  purpose: string
  do_list: string[]
  do_not_list: string[]
  as_tool_description: string
  parser: NerdOutputParser<O>
  input_preprocessors?: NerdInputPreprocessor[]
  additional_notes?: string
  tools?: StructuredToolInterface[]

  constructor(nerd_config: BaseNerdOptions, output_parser: NerdOutputParser<O>) {
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

  async stringify_input(input: I, runtime_instructions: string): Promise<{ input: string, runtime_instructions: string }> {
    // if I is string, return it directly:
    if (typeof input === "string") {
      return { input, runtime_instructions }
    }
    // otherwise, stringify it:
    return { input: JSON.stringify(input), runtime_instructions }
  }

  async postprocess_output(raw_output: string): Promise<O> {
    const parser = OutputFixingParser.fromLLM(new ChatOpenAI(), this.parser)
    return await parser.parse(raw_output) as O
  }
}

export class Nerd<I extends NerdInput, O extends NerdOutput> extends NerdBase<I, O> implements BindableNerd<I, O> {
  constructor(nerd_config: BaseNerdOptions, output_parser: NerdOutputParser<O>) {
    super(nerd_config, output_parser)
  }

  async bindToModel(model: NerdModel | NerdModelName): Promise<BoundNerd<I, O>> {
    return await (new NerdBinding(this, model)).init()
  }
}

class NerdBinding<I extends NerdInput, O extends NerdOutput> extends Nerd<I, O> implements BoundNerd<I, O> {
  prompt: ChatPromptTemplate
  model: NerdModel
  runner: Runnable

  constructor(public nerd: BaseNerd<I, O>, model: NerdModel | NerdModelName) {
    super({
      name: nerd.name,
      purpose: nerd.purpose,
      do_list: nerd.do_list,
      do_not_list: nerd.do_not_list,
      strategy: nerd.strategy,
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
      return constructPromptTemplate(this, true)
    }

    // if we're using tools, but the model doesn't bind tools, we need to include tool names in the prompt for the ReactAgent.
    return constructPromptTemplate(this, false, ReAct_Prompt_Instruction)
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

  async init(): Promise<BoundNerd<I, O>> {
    this.runner = await this.construct_runner()
    return this
  }

  async invoke(structured_input: I, querytime_instructions: string): Promise<O> {
    const { input, runtime_instructions } = await this.nerd.stringify_input(structured_input, querytime_instructions)
    const unformatted_result = await this.invoke_raw(input, runtime_instructions)
    return this.nerd.postprocess_output(unformatted_result)
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