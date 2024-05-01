import { NerdBinder, NerdBuilder } from "../../main.js"
import { buildSimpleAgentSpecifier, buildToolCallingAgentSpecifier } from "../../nerd_builder/agent_specifiers/index.js"
import { revision_output_specifier } from "../../nerd_builder/output_specifiers/index.js"
import { ProposedRevisions } from "../../nerd_builder/output_specifiers/json/revisions.js"
import { BaseNerdOptions, BoundNerd } from "../../nerd_builder/types.js"

type RevisedNerdBuilder = (opts: BaseNerdOptions) => Promise<BoundNerd<ProposedRevisions>>
export const buildRevisionNerd: RevisedNerdBuilder = async (nerd_opts) => {
  const output_specifier = revision_output_specifier
  const has_tools = nerd_opts.tools && nerd_opts.tools.length > 0

  const agent_specifier = has_tools ? buildToolCallingAgentSpecifier(nerd_opts.tools) : buildSimpleAgentSpecifier()
  const nerdBuilder = new NerdBuilder<ProposedRevisions>(output_specifier, agent_specifier)
  const nerd = nerdBuilder.build(nerd_opts)
  const nerdBinder = new NerdBinder<ProposedRevisions>(nerd)

  const output = {
    name: nerd_opts.name,
    with_openai: await nerdBinder.bindToModel("OPEN_AI"),
    with_anthropic: await nerdBinder.bindToModel("ANTHROPIC"),
  }

  if (!has_tools) {
    output["with_gemini"] = await nerdBinder.bindToModel("GEMINI")
  }

  return output
}