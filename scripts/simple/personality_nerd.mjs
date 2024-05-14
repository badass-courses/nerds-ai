import 'dotenv/config';
import { PersonalityNerd } from '../../build/src/prebuilt/index.js';
import { readFileSync } from "fs"
import { inspect } from 'util';

const text = readFileSync('./sources/107-as-const-can-make-strings-infer-as-their-literals-in-objects.md', 'utf-8');

const main = async () => {
  const output = await PersonalityNerd.with_openai.invoke(text, "A Klingon warrior getting flustered as he attempts to write accessible technical documentation for human engineers.");
  console.log(inspect(output))
};

main();
