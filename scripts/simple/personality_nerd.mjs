import 'dotenv/config';
import { personalityNerd } from '../../build/src/prebuilt/index.js';
import { readFileSync } from 'fs';
import { inspect } from 'util';

const text = readFileSync(
  './sources/107-as-const-can-make-strings-infer-as-their-literals-in-objects.md',
  'utf-8',
);

const main = async () => {
  const bound = await personalityNerd.bindToModel('gpt-4o');
  const output = await bound.invoke(
    text,
    'A Klingon warrior getting flustered as he attempts to write accessible technical documentation for human engineers.',
  );
  console.log(inspect(output));
};

main();
