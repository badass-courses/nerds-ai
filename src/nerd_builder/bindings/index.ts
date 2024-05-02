import { Runnable } from "langchain/runnables"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { StructuredTool } from "@langchain/core/tools"
import { Nerd, NerdWithPrompt, Platform } from "../types.js"
import { NerdOutput } from "../parsers/index.js"
import { createChatModel } from "../models/index.js"
import { wrapNerdAsTool } from "../tools/index.js"
import { createRunner } from "../runners/index.js"
import { OutputParserException } from "langchain/schema/output_parser"
import { OutputFixingParser } from "langchain/output_parsers"
import { ChatOpenAI } from "@langchain/openai"

export class NerdPlatformBinder<OutputType extends NerdOutput = string> {
  prompt: ChatPromptTemplate

  constructor(public nerd: NerdWithPrompt<OutputType>) {
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

    const invoke = async (input: string, runtime_instructions: string): Promise<OutputType> => {
      const text = await invoke_raw(input, runtime_instructions)
      try {
        return await this.nerd.parser.parse(text) as OutputType;
      } catch (e) {
        if (e instanceof OutputParserException) {
          const fixParser = OutputFixingParser.fromLLM(
            new ChatOpenAI(),
            this.nerd.parser
          )

          return await fixParser.parse(text) as OutputType
        } else {
          throw e
        }
      }
    }

    const invoke_raw = async (input: string, runtime_instructions: string): Promise<string> => {
      const executor = await this.construct_runner(llm);
      const opts = {}
      if (platform === "GEMINI" && this.nerd.parser.output_format === "json") {
        opts['generationConfig'] = { response_mime_type: "application/json" }
      }
      const prompt = await this.prompt.invoke({ input, runtime_instructions, format_instructions: this.nerd.parser.getFormatInstructions() })
      const output = await executor.invoke(prompt, opts)

      return output.content as string
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