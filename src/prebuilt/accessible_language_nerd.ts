import { NerdBuilder, NerdBinder } from "../nerd_builder/index.js"
import { ProposedRevisions, revision_output_specifier } from "../nerd_builder/output_specifiers/json/revisions.js"
import { buildSimpleAgentSpecifier } from "../nerd_builder/agent_specifiers/simple/simple_agent_specifier.js"

const nerd_opts = {
  name: "AccessibleLanguageNerd",
  purpose: "You are a document editing assistant who proposes revisions to a text that will make it more accessible.",
  do_list: [
    "seek to make the text more readable and understandable",
    "identify awkward wording",
    "flag overly complex sentences",
    "respect the complexity of the domain material while presenting in a more accessible way",
  ],
  do_not_list: [
    "change the meaning of the text",
    "propose edits that would make the text less accurate",
    "propose edits that would make the text less precise",
  ],
  additional_notes: "It's okay if your edit increases verbosity as long as the resulting language is clearer and more accessible.",
  as_tool_description: "This tool proposes revisions that reduce the legibility and accessibility of a given text.",
}

const output_specifier = revision_output_specifier
const agent_specifier = buildSimpleAgentSpecifier()

const nerdBuilder = new NerdBuilder<ProposedRevisions>(output_specifier, agent_specifier)

const nerd = nerdBuilder.build(nerd_opts)

const nerdBinder = new NerdBinder<ProposedRevisions>(nerd)

export const AccessibleLanguageNerd = {
  name: 'AccessibleLanguageNerd',
  with_openai: await nerdBinder.bindToModel("OPEN_AI"),
  with_anthropic: await nerdBinder.bindToModel("ANTHROPIC"),
  with_gemini: await nerdBinder.bindToModel("GEMINI")
}