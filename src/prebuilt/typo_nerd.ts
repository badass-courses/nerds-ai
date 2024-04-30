import { buildSimpleAgentSpecifier } from "../nerd_builder/agent_specifiers/simple/simple_agent_specifier.js"
import { NerdBuilder, NerdBinder } from "../nerd_builder/index.js"
import { ProposedRevisions, revision_output_specifier } from "../nerd_builder/output_specifiers/json/revisions.js"

const nerd_opts = {
  name: "TypoNerd",
  purpose: "You are a document editing assistant who proposes corrections to typos and similar small mechanical errors in a given text.",
  do_list: [
    "seek to identify mispellings",
    "flag missing words",
    "evaluate individual characters in context. for instance, a '#' character may be a markdown header on its own, or it may be part of a subheader like '###' - respect the difference, please.",
    "ensure consistency across acronyms and domain specific vocabulary",
    "ensure that punctuation is correct, but note guidance on confidence below.",
    "double check the entire text of the document from top to bottom - we are counting on you not to skip any part of it",
    "return an empty array if no edits are propsed."
  ],
  do_not_list: [
    `enforce any sort of "proper english" or other "standard" - the author may be intentionally using informal slang, for instance, and your job is to support them in their choice to do so.`,
    `propose semantic changes, unless there's obviously a missing "not" something in that vein where the author clearly intends something else.`,
    `duplicate any proposed edits. Once an objection has been found, note it once and move on.`,
    `return empty objects in the output array. If you have found no typos, return an empty array.`,
    `repeat the same proposed edit more than once, or repeat any edits that have already been rejected.`
  ],
  output_specifier: revision_output_specifier,
  as_tool_description: "This tool proposes corrections to typos and similar small mechanical errors in a given text.",
}

const output_specifier = revision_output_specifier
const agent_specifier = buildSimpleAgentSpecifier()

const nerdBuilder = new NerdBuilder<ProposedRevisions>(output_specifier, agent_specifier)

const nerd = nerdBuilder.build(nerd_opts)

const nerdBinder = new NerdBinder<ProposedRevisions>(nerd)

export const TypoNerd = {
  name: nerd_opts.name,
  with_openai: await nerdBinder.bindToModel("OPEN_AI"),
  with_anthropic: await nerdBinder.bindToModel("ANTHROPIC"),
  with_gemini: await nerdBinder.bindToModel("GEMINI")
}