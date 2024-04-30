import { buildSimpleAgentSpecifier } from "../nerd_builder/agent_specifiers/simple/simple_agent_specifier.js"
import { NerdBuilder, NerdBinder } from "../nerd_builder/index.js"
import { ProposedRevisions, revision_output_specifier } from "../nerd_builder/output_specifiers/json/revisions.js"

const nerd_opts = {
  name: "CodeSnippetTunerNerd",
  purpose: "You are a document editing assistant who edits technical documentation that has code snippets in it. Your job is to identify areas where those snippets could be improved for correctness, idiom and understanding.",
  do_list: [
    "focus exclusively on code snippets that are wrapped within a markdown codefence, like ```python ... ```",
    "ensure code snippets in the text are correct and idiomatic",
    "ensure variable names are consistent and meaningful",
    "ensure the code snippets demonstrates what the text is using it to demonstrate",
    "add comments to any code snippets whose clarity is in question",
    "respect the context!",
  ],
  do_not_list: [
    "change the fundamental behavior of the code",
    "make any assumptions beyond what is in the text of the technical documentation",
    "propose edits that target any text outside of a code fence",
  ],
  additional_notes: "**important** sometimes in technical documentation a code snippet is presented as intentionally incorrect to demonstrate a point. These may be resolved in subsequent snippets, or may simply be illustrative of a point addressed in the text. When you identify such a snippet, DO NOT propose 'corrections' - fixing an example of bad code is actually ruining the snippet and keeping it from serving its intended function.", output_specifier: revision_output_specifier,
  as_tool_description: "This tool proposes revisions that seek to improve the quality of codefenced code-snippets in markdown technical documentation.",
}

const output_specifier = revision_output_specifier
const agent_specifier = buildSimpleAgentSpecifier()

const nerdBuilder = new NerdBuilder<ProposedRevisions>(output_specifier, agent_specifier)

const nerd = nerdBuilder.build(nerd_opts)

const nerdBinder = new NerdBinder<ProposedRevisions>(nerd)

export const CodeSnippetTunerNerd = {
  name: nerd_opts.name,
  with_openai: await nerdBinder.bindToModel("OPEN_AI"),
  with_anthropic: await nerdBinder.bindToModel("ANTHROPIC"),
  with_gemini: await nerdBinder.bindToModel("GEMINI")
}