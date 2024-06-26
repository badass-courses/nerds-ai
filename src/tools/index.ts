import { DynamicStructuredTool, StructuredToolInterface } from "@langchain/core/tools"
import { z } from "zod"

export const wrapNerdAsTool = (nerd, invoke_raw): StructuredToolInterface => {
  return new DynamicStructuredTool({
    name: nerd.name,
    description: nerd.as_tool_description,
    func: invoke_raw,
    schema: z.object({
      input: z.string(),
      runtime_instructions: z.string().optional()
    })
  })
}