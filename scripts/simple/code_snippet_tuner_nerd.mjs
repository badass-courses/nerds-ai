import 'dotenv/config';
import { CodeSnippetTunerNerd } from '../../build/src/prebuilt/index.js';
import { readFileSync } from "fs"
import { inspect } from 'util';

const text = readFileSync('./sources/107-as-const-can-make-strings-infer-as-their-literals-in-objects.md', 'utf-8');

const main = async () => {
  const output = await CodeSnippetTunerNerd.with_openai.invoke(text);
  console.log(inspect(output))
};

main();
