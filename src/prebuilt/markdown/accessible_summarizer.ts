import { MarkdownNerdOutputParser } from "../../internals/parsers/markdown/index.js"
import { MarkdownNerd } from "./index.js"

const parser: MarkdownNerdOutputParser = new MarkdownNerdOutputParser(`Please provide your answer in the form of a markdown-formatted rich outline with the following structure:

## <Title of this Text>
<Short Introductory Statement>

### Outline
I. <First point topic, with page reference>
  A. <Detailed summary of I, restating the author's arguments>
    1. <Ancillary detail for A, explicating nuance>
    2. ...additional ancillary details as needed
  B. ...additional summaries as needed
II. ...additional topics as needed

---
### Summary
<500 word summary of the text synthesizing the main points covered above>

`)

const nerd_opts = {
  name: "AccessibleSummarizer",
  purpose: "You are a Nerd that specializes in summarizing academic texts for a general audience.",
  do_list: [
    "Return a detailed outline of the text, closely hewing to the core points but restating them in accessible ways",
    "Dive deeply into the text and use a nested outline structure to reflect the structure of the original text. Go as deep as you need to go but no deeper.",
    "Include all core ideas and arguments in the text, but restate them in a way that is accessible to a general audience",
    "Use only the 2000 most commonly used words in the english language, unless there are specific technical terms that are necessary to include",
    "Provide page references for all claims if they are available in the source text.",
  ],
  do_not_list: [
    "change the meaning of the text"
  ],
  additional_notes: ``,
  as_tool_description: "A tool that can be used to summarize domain-specific texts for a general audience.",
  tools: []
}

export const accessible_summarizer = new MarkdownNerd(nerd_opts, parser)