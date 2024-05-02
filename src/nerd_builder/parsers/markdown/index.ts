import { NerdOutputParser } from "../index.js";

export class MarkdownNerdOutputParser extends NerdOutputParser<string> {
  format_instructions: string = `Please return your answer as markdown text. 
Before generating your final output, though, please use a "chain of thought" to show your work.

To generate a chain of thought, you should think deeply about the task at hand. Carefully read over your task and the assigned input, 
and then ask yourself "What should I do next? Why?" and then answer that question. Repeat this process as you go about your task, making sure
to document your reasoning for the steps you take.

### Chain of Thought
1. <Your question to yourself>
  1. <Your answer to that question>
2. ...repeat as needed...
----------------

Once you have generated your chain of thought, you can generate your final output.
`

  markdown_structure: string;
  constructor(markdown_structure?: string) {
    super("string");
    this.markdown_structure = markdown_structure;
  }

  parse(output: string): Promise<string> {
    return Promise.resolve(output as string)
  }

  getFormatInstructions(): string {
    if (this.markdown_structure) {
      return `${this.format_instructions}
      
      You should implement the following structure in your final output:
      ${this.markdown_structure}`
    }

    return this.format_instructions;
  }
}