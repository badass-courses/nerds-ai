import 'dotenv/config';
import { buildPineconeBackedConceptNerd } from '../../build/src/prebuilt/index.js';
import { run_against_egghead_files } from './_runner.mjs';

const nerd = await buildPineconeBackedConceptNerd({}, { domain: "Technical Training Material in Typescript"});

const main = async () => {
  await run_against_egghead_files(
    { input_directory: './sources', output_directory: '/demos' },
    nerd,
    true
  );
};

main();
