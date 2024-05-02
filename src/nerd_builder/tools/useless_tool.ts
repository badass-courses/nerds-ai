import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

export const UselessTool = new DynamicStructuredTool({
  name: "UselessTool",
  description: `This tool is a placeholder that does nothing. Do not under any circumstances invoke it.`,
  func: async ({ input }): Promise<string> => input,
  schema: z.object({
    input: z.string()
  })
})