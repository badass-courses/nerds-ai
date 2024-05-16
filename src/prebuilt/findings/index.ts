import { Nerd } from "../../nerd.js"
import { findings_parser, Findings } from "../../nerd_builder/parsers/json/findings.js"
import { BaseNerdOptions, BindableNerd } from "../../nerd_builder/types.js"

type FindingsNerdBuilder = (opts: BaseNerdOptions) => BindableNerd<Findings>
export const buildFindingsNerd: FindingsNerdBuilder = (nerd_opts) => {
  const nerd: BindableNerd<Findings> = new Nerd<Findings>(nerd_opts, findings_parser)
  return nerd
}