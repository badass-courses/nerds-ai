import 'dotenv/config';
import { wikipediaResearchNerd } from '../../build/src/prebuilt/index.js';
import { inspect } from 'util';

const main = async () => {
  const bound = await wikipediaResearchNerd.bindToModel("gpt-4");
  const output = await bound.invoke(
    'Ukrainian Folklore',
    'See if you can focus on pre-christian folklore in particular.',
  );
  console.log(inspect(output, null, 5));
};

main();
