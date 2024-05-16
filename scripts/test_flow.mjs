import 'dotenv/config';
import { buildPineconeBackedConceptNerd } from '../build/src/prebuilt/index.js';
import { personalityNerd } from '../build/src/prebuilt/index.js';
import { readFileSync } from 'fs';
import { inspect } from 'util';

const concept_nerd = await buildPineconeBackedConceptNerd({}, { domain: "Technical Training Material in Typescript"});


const main = async () => {
  const text = readFileSync('./sources/107-as-const-can-make-strings-infer-as-their-literals-in-objects.md', 'utf-8');
  console.log("Testing " + concept_nerd.name)
  
  const bound_concept_nerd = await concept_nerd.bindToModel("gpt-4");
  const concept_raw = await bound_concept_nerd.invoke_raw(text, "")
  console.log("RAW string output from concept nerd:\n" + concept_raw)
  console.log("---")
  const concept_output = await bound_concept_nerd.invoke(text, "")
  console.log("Parsed JSON output from concept nerd:\n" + inspect(concept_output, false, 5))
  console.log("------------")


  console.log("Testing " + personalityNerd.name)
  const boundPersonalityNerd = await personalityNerd.bindToModel("gpt-4");
  const personality_raw = await boundPersonalityNerd.invoke_raw(text, "A klingon warrior")
  console.log("RAW string output from personality nerd:\n" + personality_raw)
  console.log("---")
  const personality_output = await boundPersonalityNerd.invoke(text, "A klingon warrior")
  console.log("Parsed JSON output from personality nerd:\n" + inspect(personality_output, false, 5))
}

main();
