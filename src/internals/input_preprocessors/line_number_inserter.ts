import { NerdInputPreprocessor } from "../types.js";

export const line_number_inserter: NerdInputPreprocessor = async function LineNumberInserter(input: string) {
  const lines = input.split("\n")
  // we want to always use 1-based indexing
  // we want to make sure that all line numbers use the same number of digits, followed by a pipe and a tab.
  // so we should get the number of the last line, and then use that to determine the number of digits we need.
  const number_of_digits = String(lines.length).length
  const numbered_lines = lines.map((line, i) => `${String(i + 1).padStart(number_of_digits, "0")}|\t${line}`)
  return numbered_lines.join("\n")
}