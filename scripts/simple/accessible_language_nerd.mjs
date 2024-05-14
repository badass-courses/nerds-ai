import 'dotenv/config';
import { AccessibleLanguageNerd } from '../../build/src/prebuilt/index.js';
import { readFileSync } from "fs"
import { inspect } from 'util';

const text = readFileSync('./sources/107-as-const-can-make-strings-infer-as-their-literals-in-objects.md', 'utf-8');

const main = async () => {
  const output = await AccessibleLanguageNerd.with_openai.invoke(text);
  console.log(inspect(output))
};

main();