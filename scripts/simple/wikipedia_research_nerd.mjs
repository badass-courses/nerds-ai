import 'dotenv/config';
import { wikipediaResearchNerd } from '../../build/src/prebuilt/index.js';
import { inspect } from 'util';

const main = async () => {
  const bound = await wikipediaResearchNerd.bindToModel('gpt-4o');
  const output = await bound.invoke('the minions');
  console.log(inspect(output));
};

main();
