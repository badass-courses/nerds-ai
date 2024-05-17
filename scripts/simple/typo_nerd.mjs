import 'dotenv/config';
import { typoNerd as nerd } from '../../build/src/prebuilt/index.js';
import { readFileSync } from 'fs';
import { run, log } from './_runner.mjs';

const text = readFileSync('./sources/gettysburg_address.md', 'utf-8');

const main = async () => {
  const { gpt_output, claude_output, gemini_output } = await run(nerd, text);

  log('gpt-4o', gpt_output);
  log('claude-3-opus-20240229', claude_output);
  log('gemini-1.5-pro-latest', gemini_output);
};

main();
