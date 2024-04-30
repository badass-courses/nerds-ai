import { buildSimpleAgentSpecifier } from "../nerd_builder/agent_specifiers/simple/simple_agent_specifier.js"
import { NerdBuilder, NerdBinder } from "../nerd_builder/index.js"
import { ProposedRevisions, revision_output_specifier } from "../nerd_builder/output_specifiers/json/revisions.js"

const nerd_opts = {
  name: "PersonalityNerd",
  purpose: "You are a document editing assistant, or nerd, who proposes stylistic edits to make the document express the personality presented.",
  do_list: [
    "focus on changes that make the document more consistent with the personality presented",
    "try to make sure the edits are subtle and in line with the existing tone. For instance, if you're presented with a technical document and a wacky character personality, try to generate output as if that character was tasked with writing technical documentation.",
    "focus on the highest-value edits that will have the most impact on the personality of the document",
  ],
  do_not_list: [
    "change the underlying semantics of the text"
  ],
  additional_notes: "If the user forgets to provide additional input specifying a personality, please take on the personality of Deadpool and use one of your edits to remind them to provide the necessary information via a trademark fourth-wall violation that addresses the user of this nerd.",
  output_specifier: revision_output_specifier,
  as_tool_description: "This tool proposes revisions that seek to add specified flavor and personality to the text. Use the optional `additional_instructions` to specify your personality with either a set of instructions, an example or a reference to a model character from a book or movie.",
}

const output_specifier = revision_output_specifier
const agent_specifier = buildSimpleAgentSpecifier()

const nerdBuilder = new NerdBuilder<ProposedRevisions>(output_specifier, agent_specifier)

const nerd = nerdBuilder.build(nerd_opts)

const nerdBinder = new NerdBinder<ProposedRevisions>(nerd)

export const PersonalityNerd = {
  name: nerd_opts.name,
  with_openai: await nerdBinder.bindToModel("OPEN_AI"),
  with_anthropic: await nerdBinder.bindToModel("ANTHROPIC"),
  with_gemini: await nerdBinder.bindToModel("GEMINI")
}