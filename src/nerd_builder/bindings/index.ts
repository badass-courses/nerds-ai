import { Runnable } from "@langchain/core/runnables"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { StructuredToolInterface } from "@langchain/core/tools"
import { Nerd, BindableNerd, Platform, DebugNerdOutput } from "../types.js"
import { NerdOutput } from "../parsers/index.js"
import { createChatModel } from "../models/index.js"
import { wrapNerdAsTool } from "../../tools/index.js"
import { createRunner } from "../runners/index.js"
import { OutputFixingParser } from "langchain/output_parsers"
import { ChatOpenAI } from "@langchain/openai"
import { BaseMessageChunk, ChainValues } from "langchain/schema"

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

  async construct_runner(llm, includeIntermediarySteps: boolean = false): Promise<Runnable> {
    return await createRunner(this.nerd, llm, includeIntermediarySteps)
  }

  bindToModel(platform: Platform, platformOpts = null): Nerd<OutputType> {
    const llm = this.getChatModel(platform, platformOpts)

    const invoke = async (input: string, querytime_instructions: string = ""): Promise<OutputType> => {
      const text = await invoke_raw(input, querytime_instructions)
      const parser = OutputFixingParser.fromLLM(new ChatOpenAI(), this.nerd.parser)
      return await parser.parse(text) as OutputType
    }

    const invoke_raw = async (input: string, querytime_instructions: string = ""): Promise<string> => {
      const runner = await this.construct_runner(llm)

      if (nerd.agent_specifier.agent_type === "ToolCallingAgent" || nerd.agent_specifier.agent_type === "ReactAgent") {
        const result: ChainValues = await _invoke(input, querytime_instructions, runner) as ChainValues
        return result.output as string
      } else {
        const result: BaseMessageChunk = await _invoke(input, querytime_instructions, runner) as BaseMessageChunk

        return result.content as string
      }
    }

    type RawInvocationOutput = ChainValues | BaseMessageChunk
    const _invoke = async (input: string, querytime_instructions: string = "", runner: Runnable): Promise<RawInvocationOutput> => {
      const opts = {}
      if (platform === "GEMINI" && this.nerd.parser.output_format === "json") {
        opts['generationConfig'] = { response_mime_type: "application/json" }
      }

      const invocation_input = {
        input,
        querytime_instructions,
        format_instructions: this.nerd.parser.getFormatInstructions()
      }

      return await runner.invoke(invocation_input, opts)
    }

    const debug = async (input: string, querytime_instructions: string = ""): Promise<DebugNerdOutput<OutputType>> => {
      if (this.nerd.agent_specifier.agent_type === "SimpleAgent") {
        throw new Error("Cannot use debug output with SimpleAgent")
      }

      const runner = await this.construct_runner(llm, true)
      const result = await _invoke(input, querytime_instructions, runner) as ChainValues

      return {
        output: result.output as OutputType,
        intermediate_steps: result.intermediate_steps
      }
    }

    const nerd = this.nerd
    const tool = this.as_tool(invoke_raw)

    return {
      nerd,
      tool,
      invoke,
      invoke_raw,
      debug
    }
  }
}