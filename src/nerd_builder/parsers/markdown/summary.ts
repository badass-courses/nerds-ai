import { MarkdownNerdOutputParser } from "./index.js";

const markdown_structure = `# <Title>
<A brief introduction to the document, including a summary of the source text and the purpose of the document.>
## Summary
<A summary of the source document, being careful to follow all instructions that you've been given.
Once you've written your general summary, iteratively add subsections as below until you've fully explored the source text.
A read of this summary should walk away with not only a nuanced understanding of ALL of the author's points, but also an analysis of the implications
and a set of open questions to explore further.>

### <Subsection Title>
<A subsection summary that includes key points and implications from the text.>

#### Key Points
1. <A key point that the author is trying to make, along with references to where in the source text it appeared.>
2. <continue until all key points have been captured>

#### Open Questions
1. <A question that an intelligent and curious reader might ask after reading this section.>
2. <continue as needed>

## Conclusions
<Based on your understanding of the text, please highlight any non-obvious implications in the source text.
Then conclude, formulating a closing statement that summarizes the primary thrust of the source text.>`

export const markdown_nerd_output_parser = new MarkdownNerdOutputParser(markdown_structure)