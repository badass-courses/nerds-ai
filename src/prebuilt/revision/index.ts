import { Nerd } from "../../nerd.js"
import { line_number_inserter } from "../../internals/input_preprocessors/line_number_inserter.js"
import { revision_parser, ProposedRevisions } from "../../internals/parsers/json/revision.js"
import { BaseNerdOptions, BindableNerd } from "../../internals/types.js"

type RevisionNerdBuilder = (opts: BaseNerdOptions) => BindableNerd<ProposedRevisions>
export const buildRevisionNerd: RevisionNerdBuilder = (nerd_opts) => {
  const preprocessors = nerd_opts.input_preprocessors || []
  preprocessors.push(line_number_inserter)
  nerd_opts.input_preprocessors = preprocessors;
  const nerd: BindableNerd<ProposedRevisions> = new Nerd<ProposedRevisions>(nerd_opts, revision_parser)
  return nerd
}