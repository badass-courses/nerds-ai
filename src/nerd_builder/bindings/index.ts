import { Runnable } from "@langchain/core/runnables"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { StructuredTool } from "@langchain/core/tools"
import { Nerd, BindableNerd, Platform } from "../types.js"
import { NerdOutput } from "../parsers/index.js"
import { createChatModel } from "../models/index.js"
import { wrapNerdAsTool } from "../tools/index.js"
import { createRunner } from "../runners/index.js"
import { OutputFixingParser } from "langchain/output_parsers"
import { ChatOpenAI } from "@langchain/openai"

export class NerdPlatformBinder<OutputType extends NerdOutput = string> {
  prompt: ChatPromptTemplate

  constructor(public nerd: BindableNerd<OutputType>) {
    this.prompt = this.nerd.prompt
  }

  getChatModel(platform: Platform, opts = null): Runnable {
    return createChatModel(this.nerd, platform, opts)
  }

  as_tool(invoke_raw): StructuredTool {
    return wrapNerdAsTool(this.nerd, invoke_raw)
  }

  async construct_runner(llm): Promise<Runnable> {
    return await createRunner(this.nerd, llm)
  }

  bindToModel(platform: Platform, platformOpts = null): Nerd<OutputType> {
    const llm = this.getChatModel(platform, platformOpts)

    const invoke = async (input: string, querytime_instructions: string = ""): Promise<OutputType> => {
      const text = await invoke_raw(input, querytime_instructions)
      const parser = OutputFixingParser.fromLLM(new ChatOpenAI(), this.nerd.parser)
      return await parser.parse(text) as OutputType
    }

    const invoke_raw = async (input: string, querytime_instructions: string = ""): Promise<string> => {
      const runner = await this.construct_runner(llm);
      const opts = {}
      if (platform === "GEMINI" && this.nerd.parser.output_format === "json") {
        opts['generationConfig'] = { response_mime_type: "application/json" }
      }

      const invocation_input = {
        input,
        querytime_instructions,
        format_instructions: this.nerd.parser.getFormatInstructions()
      }

      try {
        const result = await runner.invoke(invocation_input, opts)
        return (result.output || result.content) as string
      } catch (e) {
        console.error(e)
        return "I'm sorry, I couldn't generate a response."
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