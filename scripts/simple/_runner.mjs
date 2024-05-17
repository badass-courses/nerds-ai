import { inspect } from 'util';

export const bindToModels = async (nerd) => {
  return {
    gpt: await nerd.bindToModel('gpt-4o'),
    claude: await nerd.bindToModel('claude-3-opus-20240229'),
    gemini: await nerd.bindToModel('gemini-1.5-pro-latest'),
  };
};

export const run = async (nerd, input, query_time_instructions = '') => {
  const { gpt, claude, gemini } = await bindToModels(nerd);
  let gpt_output, claude_output, gemini_output;

  try {
    gpt_output = await gpt.invoke(input, query_time_instructions);
  } catch (e) {
    gpt_output = e;
  }

  try {
    claude_output = await claude.invoke(input, query_time_instructions);
  } catch (e) {
    claude_output = e;
  }

  try {
    gemini_output = await gemini.invoke(input, query_time_instructions);
  } catch (e) {
    gemini_output = e;
  }

  return { gpt_output, claude_output, gemini_output };
};

export const log = (model, output) => {
  console.log(`#### Sample Output - ${model}`);
  console.log('```typescript\n' + inspect(output, { depth: null }) + '\n```\n');
};
