import 'dotenv/config';
import { codeSnippetTunerNerd } from '../../build/src/prebuilt/index.js';
import { run_against_egghead_files } from './_runner.mjs';

const main = async () => {
  await run_against_egghead_files(
    { input_directory: './sources', output_directory: '/demos' },
    codeSnippetTunerNerd,
  );
};

main();
