import { OutputParserException } from "@langchain/core/output_parsers";
import { NerdOutputParser, NerdOutput } from "../index.js";

export class JsonNerdOutputParser<T extends NerdOutput> extends NerdOutputParser<T> {
  format_instructions: string = `Please return your output in compliance with the JSON schema below.

Note that your output has space for a "thought_log" array of strings. To populate this array, you should think deeply about the task at hand.
Ask yourself "What should I do next? Why?" and then answer that question as specifically as you can.
Repeat this process as you go about your task, making sure to document your thoughts in the "thought_log" array.

Your final response, including the log of your thoughts, should be a single JSON object that implements the typescript type defined below.
Please DO NOT wrap your response in any kind of text or code fence, it is essential that you return valid JSON that is machine parsable.
The first character of your output MUST be '{' and the last character MUST be '}', and the entire content should be a properly-escaped JSON object. 

Please double check that your response starts with '{' and ends with '}'.

Output Schema:

`
  schema_string: string;
  constructor(schema_string: string) {
    super("json");
    this.schema_string = schema_string;
  }

  parse(output: string): Promise<T> {
    const start = output.indexOf("{")
    const end = output.lastIndexOf("}")

    if (start === -1 || end === -1) {
      throw new OutputParserException("Error parsing JSON output - unable to find start and/or end of JSON object.", output, this.getFormatInstructions(), true)
    }

    const trimmed = output.slice(start, end + 1).replaceAll("{{", "{").replaceAll("}}", "}")

    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (e) {
      throw new OutputParserException("Error parsing JSON output", output, this.getFormatInstructions(), true)
    }

    let final_output: T
    try {
      final_output = parsed as T
    } catch (e) {
      throw new OutputParserException("We parsed the JSON output, but the resulting object did not conform to the desired schema.", JSON.stringify(parsed), this.getFormatInstructions(), true)
    }

    return Promise.resolve(final_output)
  }

  getFormatInstructions(): string {
    return `${this.format_instructions}${this.schema_string}`;
  }
}