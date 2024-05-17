import 'dotenv/config';
import { wikipediaResearchNerd as nerd } from '../../build/src/prebuilt/index.js';
import { run, log } from './_runner.mjs';

const topic = 'Hermetic Tradition';

const main = async () => {
  const { gpt_output, claude_output, gemini_output } = await run(nerd, topic);

  log('gpt-4o', gpt_output);
  log('claude-3-opus-20240229', claude_output);
  log('gemini-1.5-pro-latest', gemini_output);
};

main();
