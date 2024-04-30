import { Runnable } from "langchain/runnables"
import { AgentType, ModelType } from "../agent_specifiers/index.js"
import { ChatOpenAI, OpenAI } from "@langchain/openai"
import { ChatAnthropic } from "@langchain/anthropic"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatPromptTemplate } from "langchain/prompts"
import { DynamicStructuredTool, StructuredTool } from "langchain/tools"
import { z } from "zod"
import { Nerd, NerdWithPrompt, Platform } from "../types.js"
import { AgentExecutor, createReactAgent, createToolCallingAgent } from "langchain/agents"


const human_input_placeholder = `Please perform your assigned duties against the following input:

{input}`

const default_gpt_opts = {
  model: "gpt-4-turbo",
  temperature: 0
}

const default_json_gpt_opts = {
  model: "gpt-4-turbo",
  temperature: 0,
  response_format: {
    type: "json_object"
  }
}

const default_claude_opts = {
  model: "claude-3-opus-20240229",
  temperature: 0
}

const default_gemini_opts = {
  model: 'gemini-1.5-pro-latest',
  temperature: 0,
}

export class NerdParsingError extends Error {
  raw_output: string
  constructor(raw_output: string) {
    super("Error parsing nerd output!")
    this.name = "NerdParsingError"
    this.raw_output = raw_output
  }
}

export class NerdPlatformBinder<OutputType = string> {
  prompt: ChatPromptTemplate
  constructor(public nerd: NerdWithPrompt<OutputType>) {
    this.prompt = ChatPromptTemplate.fromMessages([["system", this.nerd.prompt], ["human", human_input_placeholder]])
  }

  getChatModel(platform: Platform, opts = null): Runnable {
    if (this.nerd.allowed_platforms.indexOf(platform) === -1) {
      throw new Error(`Model platform ${platform} not allowed for this agent`)
    }

    if (platform === "OPEN_AI") {
      const openai_opts = opts || this.nerd.output_format == "json" ? default_json_gpt_opts : default_gpt_opts
      return this.nerd.preferred_model_type === ModelType.LLM ? new OpenAI(opts) : new ChatOpenAI(openai_opts)
    }

    if (platform === "ANTHROPIC") {
      if (this.nerd.preferred_model_type === ModelType.LLM) {
        console.warn("Anthropic does not support the LLM model type, defaulting to their Chat model.")
      }
      return new ChatAnthropic(opts || default_claude_opts)
    }

    if (platform === "GEMINI") {
      if (this.nerd.preferred_model_type === ModelType.LLM) {
        console.warn("Anthropic does not support the LLM model type, defaulting to their Chat model.")
      }

      return new ChatGoogleGenerativeAI(opts || default_gemini_opts)
    }

    throw new Error(`Model platform ${platform} not supported`)
  }

  as_tool(invoke_raw): StructuredTool {
    return new DynamicStructuredTool({
      name: this.nerd.name,
      description: this.nerd.as_tool_description,
      func: invoke_raw,
      schema: z.object({
        input: z.string(),
        runtime_instructions: z.string().optional()
      })
    })
  }

  async construct_runner(llm): Promise<Runnable> {
    if (this.nerd.agent_type === AgentType.SimpleAgent) {
      return llm
    }

    if (this.nerd.agent_type === AgentType.ToolCallingAgent) {
      const tools = this.nerd.tools
      const prompt = this.prompt
      const agent = await createToolCallingAgent({ tools, prompt, llm })
      return new AgentExecutor({ agent, tools })
    }

    if (this.nerd.agent_type === AgentType.ReactAgent) {
      const tools = this.nerd.tools
      const prompt = this.prompt
      const agent = await createReactAgent({ tools, prompt, llm })
      return new AgentExecutor({ agent, tools })
    }

    throw new Error(`Agent type ${this.nerd.agent_type} not supported`)
  }

  bindToModel(platform: Platform, platformOpts = null): Nerd<OutputType> {
    const llm = this.getChatModel(platform, platformOpts)

    const invoke = async (input: string, runtime_instructions: string): Promise<OutputType> => {
      const text = await invoke_raw(input, runtime_instructions)
      if (this.nerd.output_format === "json") {
        const json = text;
        // the output may wrap the JSON in a codefence or other formatting. Let's make sure we remove any characters from the front prior to "{" and any from the end after the final "}"
        let start = json.indexOf("{")
        let end = json.lastIndexOf("}")

        if (start === -1 || end === -1) {
          console.error("Error parsing nerd output for some reason. Here's what it spit out:")
          console.dir(json)
          throw new Error("Error parsing JSON output")
        }

        // sometimes, randomly, the JSON output will double up the curly braces around the JSON object. Let's check for that and trim it if necessary.
        if (json.indexOf("{{") === 0) {
          start++
          end--
        }

        const trimmed = json.slice(start, end + 1)
        try {
          return JSON.parse(trimmed) as OutputType
        } catch (e) {
          throw new NerdParsingError(trimmed)
        }

      } else {
        return text as OutputType
      }
    }

    const invoke_raw = async (input: string, runtime_instructions: string): Promise<string> => {
      const executor = await this.construct_runner(llm);
      const opts = {}
      if (platform === "GEMINI" && this.nerd.output_format === "json") {
        opts['generationConfig'] = { response_mime_type: "application/json" }
      }


      const prompt = (this.nerd.agent_type === AgentType.SimpleAgent) ? await this.prompt.invoke({ input, runtime_instructions }) : this.prompt
      const output = await executor.invoke(prompt, opts)

      return output.content as string
    }

    return {
      nerd: this.nerd,
      invoke,
      invoke_raw,
      as_tool: this.as_tool(invoke_raw)
    }
  }
}