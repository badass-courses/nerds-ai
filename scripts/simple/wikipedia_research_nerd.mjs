import 'dotenv/config';
import { wikipediaResearchNerd } from '../../build/src/prebuilt/index.js';
import { inspect } from 'util';

const main = async () => {
  const bound = await wikipediaResearchNerd.bindToModel(
    'gemini-1.5-pro-latest',
  );
  const output = await bound.invoke('the minions');
  console.log(inspect(output));
};

main();
