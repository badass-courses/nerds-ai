import 'dotenv/config';
import { PersonalityNerd } from '../build/src/prebuilt/index.js';
import { run_against_egghead_files } from './_runner.mjs';

const main = async () => {
  const personality = process.argv[2] || '';

  await run_against_egghead_files(
    { input_directory: './sources', output_directory: './demos' },
    PersonalityNerd,
    personality,
  );
};

main();
