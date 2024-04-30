import { inspect } from "util"
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs"

export const run_against_egghead_files = async ({ directory_path, output_path }, nerd, additional_instructions = "") => {
  const directory = readdirSync('./directory_path').filter(str => str.endsWith('.md'))
  const outputs = []
  const output_directory = `./script_output/${nerd.name}/${Date.now()}`
  mkdirSync(output_directory, { recursive: true })
  
  console.log(`  Now running \`${nerd.name}\` against our sample egghead documents.`)
  for (const file of directory) {
    const output = await process_file_with_nerds(file, nerd.name, additional_instructions, {invoke_gpt: nerd.with_openai.invoke, invoke_anthropic:nerd.with_anthropic.invoke, invoke_gemini: nerd.with_gemini.invoke})
    const path = `${output_directory}/${file}`
    writeFileSync(path, output)
    outputs.push(output)
  }

  console.log(`\n\n\`${nerd.name}\` completed against egghead documents.`)
  console.log(`Check \`${output_directory}\` for the results.`)

  return outputs
}

const process_file_with_nerds = async (filename, nerd_name, additional_instructions, { invoke_gpt, invoke_anthropic, invoke_gemini }) => {
  const text = readFileSync('./sources/' + filename)
  console.log(`    Performing \`${nerd_name}\` against ${filename}`)

  console.log(`      Running GPT`)
  let gpt_output;
  let formatted_gpt_output = "[pending]"
  try {
    gpt_output = await invoke_gpt(text, additional_instructions)
    formatted_gpt_output = inspect(gpt_output, false, 5)
  } catch (e) {
    formatted_gpt_output = `[Error running GPT: ${e}]`
  }
  console.log(formatted_gpt_output)
  console.log("\n\n")

  console.log(`      Running Anthropic`)
  let anthropic_output
  let formatted_anthropic_output = "[pending]"
  try {
    anthropic_output = await invoke_anthropic(text, additional_instructions)
    formatted_anthropic_output = inspect(anthropic_output, false, 5)
  } catch (e) {
    formatted_anthropic_output = `[Error running Anthropic: ${e}]`
  }
  console.log(formatted_anthropic_output)
  console.log("\n\n")
  

  console.log(`      Running Gemini`)
  let gemini_output
  let formatted_gemini_output = "[pending]"
  try {
    gemini_output = await invoke_gemini(text, additional_instructions)
    formatted_gemini_output = inspect(gemini_output, false, 5)
  } catch (e) {
    formatted_gemini_output = `[Error running Gemini: ${e}]`
  }
  console.log(formatted_gemini_output)
  console.log("\n\n")

return `---
title: Output of ${nerd_name} against ${filename}
description: Generating proposed edits against a source text file using the ${nerd_name} nerd. The source text is included, followed by edits generated by the same nerd against three different LLMs.
---

${text}

### Operation Results:
This operation generated results by running the ${nerd_name} nerd against the source text using three different LLMs. The results are as follows:

#### GPT:
\`\`\`typescript
${formatted_gpt_output}
\`\`\`

#### Anthropic:
\`\`\`typescript
${formatted_anthropic_output}
\`\`\`

#### Gemini:
\`\`\`typescript
${formatted_gemini_output}
\`\`\``
}
