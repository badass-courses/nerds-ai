import 'dotenv/config';
import { WikipediaResearchNerd } from '../../build/src/prebuilt/index.js';
import { inspect } from 'util';

const main = async () => {
  const output = await WikipediaResearchNerd.with_anthropic.invoke(
    'Ukrainian Folklore',
    'See if you can focus on pre-christian folklore in particular.',
  );
  console.log(inspect(output, null, 5));
};

main();
