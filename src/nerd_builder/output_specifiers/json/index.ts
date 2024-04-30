import { OutputSpecifier } from "../index.js"

export interface JsonSpecifier<T> extends OutputSpecifier<T> {
  output_format: "json"
}

type JsonOutput = {
  thoughts: string[]
}

export class JsonSchemaBuilder<T extends JsonOutput> {
  constructor(public string_representation: string) { }
  build(): JsonSpecifier<T> {
    return {
      output_format: "json",
      prompt_output_string: `Please return your output in compliance with the JSON schema below. 
DO NOT wrap the output in any kind of text or even any kind of code fence, it is essential that you return valid JSON that is machine parsable.
The first character of your output MUST be '{{' and the last character MUST be '}}'.

Output Schema:
${this.string_representation}`,
      parse: (json): T => {
        try {
          return JSON.parse(json) as T
        } catch (e) {
          console.log("Unable to parse JSON!")
          console.error(e)
          throw e
        }
      }
    }
  }
}