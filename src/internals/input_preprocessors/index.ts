import { NerdInputPreprocessor } from "../types.js"

export { line_number_inserter } from "./line_number_inserter.js"

export const apply_preprocessors = async (input: string, preprocessors: NerdInputPreprocessor[] = []): Promise<string> => {
  let processed_input = input
  for (const preprocessor of preprocessors) {
    processed_input = await preprocessor(processed_input)
  }
  return processed_input
}