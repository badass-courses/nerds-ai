import { Runnable } from "@langchain/core/runnables"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { StructuredToolInterface } from "@langchain/core/tools"
import { Nerd, BindableNerd, Platform } from "../types.js"
import { NerdOutput } from "../parsers/index.js"
import { createChatModel } from "../models/index.js"
import { wrapNerdAsTool } from "../../tools/index.js"
import { createRunner } from "../runners/index.js"
import { OutputFixingParser } from "langchain/output_parsers"
import { ChatOpenAI } from "@langchain/openai"
import { RunnableConfig } from "@langchain/core/runnables"

export class NerdPlatformBinder<OutputType extends NerdOutput = string> {
  prompt: ChatPromptTemplate

  constructor(public nerd: BindableNerd<OutputType>) {
    this.prompt = this.nerd.prompt
  }

  getChatModel(platform: Platform, opts = null): Runnable {
    return createChatModel(this.nerd, platform, opts)
  }

  as_tool(invoke_raw): StructuredToolInterface {
    return wrapNerdAsTool(this.nerd, invoke_raw)
  }

  async construct_runner(llm): Promise<Runnable> {
    return await createRunner(this.nerd, llm)
  }

  getInvocationOpts(platform: Platform): Partial<RunnableConfig> {
    const opts = {}
    if (platform === "GEMINI" && this.nerd.parser.output_format === "json") {
      opts['generationConfig'] = { response_mime_type: "application/json" }
    }

    return opts
  }

  bindToModel(platform: Platform, platformOpts = null): Nerd<OutputType> {
    const llm = this.getChatModel(platform, platformOpts)

    const invoke = async (input: string, querytime_instructions: string = ""): Promise<OutputType> => {
      const parser = OutputFixingParser.fromLLM(new ChatOpenAI(), this.nerd.parser)
      const runner = await this.construct_runner(llm)
      const agent_output = await runner.invoke({
        input,
        querytime_instructions,
        format_instructions: this.nerd.parser.getFormatInstructions()
      }, this.getInvocationOpts(platform))

      const unformatted_result = (this.nerd.agent_specifier.agent_type === "SimpleAgent") ? agent_output.content : agent_output.output;
      return await parser.parse(unformatted_result) as OutputType
    }

    const invoke_raw = async (input: string, querytime_instructions: string = ""): Promise<string> => {
      const runner = await this.construct_runner(llm);
      const result = await runner.invoke({
        input,
        querytime_instructions,
        format_instructions: this.nerd.parser.getFormatInstructions()
      }, this.getInvocationOpts(platform))

      if (nerd.agent_specifier.agent_type === "ToolCallingAgent" || nerd.agent_specifier.agent_type === "ReactAgent") {
        return result.output as string
      } else {
        return result.content as string
      }
    }

    const nerd = this.nerd
    const tool = this.as_tool(invoke_raw)

    return {
      nerd,
      tool,
      invoke,
      invoke_raw
    }
  }
}