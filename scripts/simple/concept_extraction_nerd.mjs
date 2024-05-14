import 'dotenv/config';
import { buildPineconeBackedConceptNerd } from '../../build/src/prebuilt/index.js';
import { readFileSync } from "fs"
import { inspect } from 'util';

const text = readFileSync('./sources/107-as-const-can-make-strings-infer-as-their-literals-in-objects.md', 'utf-8');
const nerd = await buildPineconeBackedConceptNerd({}, { domain: "Technical Training Material in Typescript"});
const main = async () => {
  const output = await nerd.with_openai.invoke(text);
  console.log(inspect(output))
};

main();
