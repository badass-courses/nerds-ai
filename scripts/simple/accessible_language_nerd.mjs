import 'dotenv/config';
import { accessibleLanguageNerd } from '../../build/src/prebuilt/index.js';
import { readFileSync } from "fs"
import { inspect } from 'util';

const text = readFileSync('./sources/107-as-const-can-make-strings-infer-as-their-literals-in-objects.md', 'utf-8');

const main = async () => {
  const bound = await accessibleLanguageNerd.bindToModel("gpt-4");
  const output = await bound.invoke(text);
  console.log(inspect(output))
};

main();
