import 'dotenv/config';
import { run, log } from './_runner.mjs';
import { codeSnippetTunerNerd as nerd } from '../../build/src/prebuilt/index.js';
import { readFileSync } from 'fs';

const text = readFileSync(
  './sources/107-as-const-can-make-strings-infer-as-their-literals-in-objects.md',
  'utf-8',
);

const main = async () => {
  const { gpt_output, claude_output, gemini_output } = await run(nerd, text);

  log('gpt-4o', gpt_output);
  log('claude-3-opus-20240229', claude_output);
  log('gemini-1.5-pro-latest', gemini_output);
};

main();
