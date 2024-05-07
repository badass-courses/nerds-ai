import 'dotenv/config';
import { WikipediaResearchNerd } from '../../build/src/prebuilt/index.js';
import { inspect } from 'util';

const main = async () => {
  const output = await WikipediaResearchNerd.with_openai.invoke("Danny Greene");
  console.log(inspect(output))
};

main();
