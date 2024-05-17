import { MarkdownNerdOutputParser } from "./index.js";

const markdown_structure = `\`\`\`<language_name>
<your code here>
\`\`\``

export const markdown_nerd_output_parser = new MarkdownNerdOutputParser(markdown_structure)