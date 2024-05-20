# nerds-ai

This repo contains a suite of "nerds", which are abstractions around various LLM flows. A nerd is specific, easily defined, and composable as a tool so it can be passed either to other nerds or to general tool-calling agents. The goal is to make it easy to build and test new LLM flows by providing a set of building blocks that can be easily combined and tested.

This repo contains a variety of [prebuilt nerds](./src/prebuilt) that can be used directly, or which can be used as examples for building new nerds.

## Setup

### Environment Variables

You should define your environment variables to contain the following as specified in `.env.template`. The current implementation simply expects all of this stuff to be in your .env, and may throw errors if you try to perform a flow that requires one of these variables without having it defined:

```bash
GOOGLE_API_KEY="REPLACE_ME"
ANTHROPIC_API_KEY="REPLACE_ME"
OPENAI_API_KEY="REPLACE_ME"

PINECONE_API_KEY="REPLACE_ME"
PINECONE_ENVIRONMENT="REPLACE_ME"
PINECONE_INDEX_NAME="REPLACE_ME"
```

### Using Prebuilt Nerds

This library ships with some prebuilt nerds - a list and example output from these nerds is documented below. To run them yourself, set up your environment variables as specified above and then create some javascript/typescript that looks like this:

```typescript
import 'dotenv/config';
import { accessibleLanguageNerd } from 'nerds-ai';
import { inspect } from 'util';

const input_text = `Fourscore and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battlefield of that war. We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.`;

async function main() {
  const nerd = await accessibleLanguageNerd.bindToModel('gpt-4o');
  const result = await nerd.invoke(input_text);

  console.log(inspect(result, false, null, false));
}

main();
```

You'll get a response that looks like this:

```json
{
  "thought_log": [
    "First, I need to identify complex words and phrases that can be simplified while preserving the meaning.",
    "The phrase 'Fourscore and seven years ago' is archaic and can be simplified.",
    "The term 'conceived in Liberty' can be made clearer.",
    "The phrase 'dedicated to the proposition that all men are created equal' can be simplified.",
    "The sentence 'Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure.' is quite complex and can be broken down.",
    "The phrase 'We are met on a great battlefield of that war' can be simplified.",
    "The sentence 'We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live.' is long and can be broken down.",
    "The phrase 'It is altogether fitting and proper that we should do this.' can be simplified."
  ],
  "proposed_edits": [
    {
      "line_number": 1,
      "existing_text": "Fourscore and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.",
      "proposed_replacement": "Eighty-seven years ago, our ancestors created a new nation on this continent, based on freedom and the idea that all people are equal.",
      "reasoning": "Simplifies the archaic language and makes the sentence clearer.",
      "multiple_matches": false,
      "confidence": 0.9
    },
    {
      "line_number": 1,
      "existing_text": "Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure.",
      "proposed_replacement": "Now we are in a great civil war, testing if that nation, or any nation with such beliefs, can last.",
      "reasoning": "Breaks down the complex sentence and uses simpler words.",
      "multiple_matches": false,
      "confidence": 0.9
    },
    {
      "line_number": 1,
      "existing_text": "We are met on a great battlefield of that war.",
      "proposed_replacement": "We are here on a major battlefield of that war.",
      "reasoning": "Simplifies the phrase and makes it more direct.",
      "multiple_matches": false,
      "confidence": 0.95
    },
    {
      "line_number": 1,
      "existing_text": "We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live.",
      "proposed_replacement": "We have come to set aside part of this field as a final resting place for those who gave their lives so that the nation might live.",
      "reasoning": "Breaks down the long sentence and uses simpler words.",
      "multiple_matches": false,
      "confidence": 0.9
    },
    {
      "line_number": 1,
      "existing_text": "It is altogether fitting and proper that we should do this.",
      "proposed_replacement": "It is right and proper that we do this.",
      "reasoning": "Simplifies the phrase and makes it more direct.",
      "multiple_matches": false,
      "confidence": 0.95
    }
  ]
}
```

### Creating Your Own Nerds

A nerd can be defined independently of any LLMs, and then bound to different LLMs for execution. We first create a nerd by instantiating the `Nerd` class, and then we `bind` that nerd to one or more LLMs for execution. A `Nerd` takes a set of nerd options and an output parser.

For examples, take a look at how the prebuilt nerds are defined in [./src/prebuilt](./src/prebuilt/). Note that I first create a typed nerd definition (like [revision](./src/prebuilt/revision/index.ts) or [findings](./src/prebuilt/findings/index.ts)), and then I use that to implement different nerds that define specific behaviors bound to those structures.

#### Output Parsers - How We Get Typed Output

If we want a JSON nerd that returns typed output, we need to give the nerd definition a JSON output parser. You can see how we do this in our `revision` and `findings` nerd definitions linked above, but I'll embed an example here for reference. This is mostly handled by creating a typescript type that extends `NerdOutput` and an accompanying string describing to the LLM how to structure its response. The `findings` nerds linked above both use this approach - they're just instantiating the `FindingsNerd` class with different parameters.

```typescript
import { Nerd } from "../../nerd.js"
import { BaseNerdOptions } from "../../internals/types.js"
import { NerdOutput } from "../../internals/parsers/index.js"
import { JsonNerdOutputParser } from "../../internals/parsers/json/index.js"

const schema = `{
  // the "thought_log" array is for tracking your own thoughts as you carry out your task.
  // Please log your process and observations here as you go, ensuring to keep your thoughts in order.
  // Use these thoughts as you complete your task to help you stay focused.
  "thought_log": string[],

  // Your task is to identify some set of findings. Please return them here as individual strings.
  "findings": string[]
}`

export type Findings = NerdOutput & {
  findings: string[]
}

export const findings_parser: JsonNerdOutputParser<Findings> = new JsonNerdOutputParser<Findings>(schema)

export class FindingsNerd extends Nerd<Findings> {
  constructor(nerd_opts: BaseNerdOptions) {
    super(nerd_opts, findings_parser)
  }
}
```

#### BaseNerd<T>

At its core a nerd is an object that defines what the LLM does and how. This is mostly used to implement the system message, and contains a few parameterizable things.

```typescript
export type BaseNerd<T extends NerdOutput> = {
  // the name of the nerd
  name: string;

  // a concise and direct summary of the nerd's purpose
  purpose: string;

  // a set of things that the nerd should actively seek to do as it runs
  do_list: string[];

  // a set of things that the nerd should avoid doing as it runs
  do_not_list: string[];

  // when the nerd is wrapped as a tool, how is that tool described?
  as_tool_description: string;

  // this is a wildcard field to include additional instructions to the nerd that are not covered by the above fields
  additional_notes?: string;

  // Nerds have the option to use Tools to help them accomplish their goals. This is a list of tools that the nerd can use.
  // If the model you bind to supports tool calling, great! If not we'll do our best to coerce tool support by inserting ReAct instructions
  // into the prompt and passing it to a ReAct agent for execution.
  tools?: StructuredToolInterface[];

  // The output parser is primarily used to convert the string output of the LLM into a structured object of a given type.
  parser: NerdOutputParser<T>;
};
```

#### Binding Nerds to Models

Once you have a BaseNerd you can bind it to an LLM. If you're using the `Nerd` class (`const nerd = new Nerd(params)`), you can invoke `await nerd.bindToModel(model)` to get a `BoundNerd` which you can execute. The `model` argument in this case can either be the name of a supported model (like `gpt-4o`) or an instance of the NerdModel interface.

```typescript
type BoundNerd<T extends NerdOutput> = {
  // this is a reference to the underlying BaseNerd object
  nerd: BaseNerd<T>;

  // this method will return a structured object of the type specified in the BaseNerd object
  invoke: (input: string, runtime_instructions: string) => Promise<T>;

  // this method will return a raw string output from the LLM. When using a nerd as a tool it's necessary to pass a string back into the invoking flow,
  // so this method gives us a way to do that.
  invoke_raw: (input: string, runtime_instructions) => Promise<string>;

  // this is a wrapped version of the nerd - it implements the `invoke_raw` method and specifies the tool description and input schema.
  tool: StructuredToolInterface;
};
```

### Nerd Output

Fundamentally there are two kinds of nerds - those that return structured JSON objects and those that return markdown strings. In either case, a nerd's output will generally specify a "thought log" as well as its actual final output. There are various kinds of JSON Nerd Outputs out there - the prebuilt nerds have a simple `Findings` output type which simply returns an array of strings, and a more complex `ProposedRevisions` output type which returns some structured data whose purpose is to allow a user to build an interface where they can accept or reject proposed revisions to a text.

### A Note on Tool Use

Not all LLMs support tool use, but that's okay! If you bind a nerd to an LLM that doesn't natively support tools we use LangChain's "ReAct Agent" and agent executor to coerce the LLM into supporting tools anyway. This is a bit hackier than native tool support, and you may end up with errors, but as you can see from the examples below even our tool-using nerds work against Gemini, which does not support tool use natively.

## Project Next Steps

I've got a lot of things I'd like to add to this project, here is a general list:

- [ ] Add chat memory and conversational context to the nerds so they're not just one-and-done if you don't want them to be.
- [ ] Building on the ConceptExtraction model with vector-store based canonical concepts, I want to build a graph data extractor. The idea would be to extract a graph of concepts from a given text, and then use that graph to build a structured JSON object that represents the relationships between those concepts and persist it in something like Nebula. This graph can then be used via a RAG flow to feed into other nerds.
- [ ] Create a `DynamicToolNerd` which is designed to allow users to implement tools with specific signatures at runtime. This way we could e.g. implement a ConceptStore nerd that has its own bespoke database accessors that e.g. perform I/O against a dynamically defined pinecone index and also allow writes to a separate K/V store that actually tracks concepts, etc.
- [ ] LangChain exposes an experimental AutoGPT feature. I haven't dug too deeply into this yet, but I think that I can swing this in a way that would allow me to build an "AutoNerd" that has access to the full suite of nerds as well as the capacity implement entirely new nerds as it runs. This could then become the "Digital Gardener" we've talked about, constantly running against the entire suite of content and proposing revisions constantly over time without needing to be invoked directly.
- [x] Add input pre-processors so that nerds can do things like insert line-number annotations and other things to their input prior to running them.
- [x] Make `agent_specifier` completely internal. In practice every decision it makes should be able to be automated based on e.g. whether or not the nerd is using tools, and which platform we're running against.
- [x] Ensure that our nerds can execute tools even against LLMs that don't natively support tool use, by falling back to the ReAct agent flow. This works!!

## Prebuilt Nerds

This is a running list of prebuilt nerds including sample outputs when run against a document from the egghead source material. The input document is not checked into the repo because those texts are proprietary, I'm happy to share them with other egghead folks if you want to run them yourselves or you can run them against your own stuff.

There are currently two different kinds of nerds - those that return a markdown string and those that return a structured JSON object. The markdown string nerds are generally used for simple tasks like summarization, while the structured JSON nerds are used for more complex tasks like proposing revisions to a text. The prebuilt nerds are currently all built to return JSON.

There are currently two JSON output types defined. Both return an object with a `thought_log` string array as well as a typed payload.

- `Findings` - A Findings nerd is really straightforward. It simply returns an array of strings that represent the findings of the nerd. This is useful to prepare concise input to other nerds, for instance.
- `Revisions` - A Revisions nerd is a bit more ambitious. Given some text input, it returns a list of proposed revisions to that text. The idea is that a user can then accept/reject those revisions via some user interface, seamlessly mutating the text.

I've got a number of different kinds of prebuilt nerds that implement these two basic types, and as you can see it's hopefully pretty straightforward to define new ones. The examples you'll find below are all defined in [./scripts/simple](./scripts/simple/) and you can run them yourself if you have the appropriate environment variables defined and can supply text input. Note that we are generating inputs only against OpenAI, but all tools except wiki and content extraction are available for Anthropic and Google as well. The tool-using nerds (wiki and context) require a tool-using LLM, and currently Gemini doesn't support that so they won't work with Gemini, but work fine with Anthropic as well as OpenAI.

### Prebuilt Revision Nerd: AccessibleLanguageNerd

This nerd takes a text input and returns a list of proposed revisions to make the text more accessible. This is a good example of a nerd that returns a `Revisions` object. The [definition](./src/prebuilt/revision/accessible_language_nerd.ts) is straightforward and easily tunable. The output you'll receive looks like this:

#### Sample Output - gpt-4o

```typescript
{
  thought_log: [
    'First, I will read through the entire text to understand its meaning and identify areas that could be simplified.',
    'The text is a famous historical speech, so I need to be careful not to change its meaning.',
    'I will focus on simplifying complex sentences and replacing less common words with more common ones while preserving the original message.'
  ],
  proposed_edits: [
    {
      line_number: 1,
      existing_text: 'Four score and seven years ago our fathers brought forth on this continent a new nation, conceived in liberty, and dedicated to the proposition that all men are created equal.',
      proposed_replacement: 'Eighty-seven years ago, our ancestors created a new nation on this continent. This nation was founded on freedom and the idea that all people are created equal.',
      reasoning: "The phrase 'Four score and seven years ago' is outdated and can be replaced with 'Eighty-seven years ago' for clarity. 'Our fathers' can be simplified to 'our ancestors,' and 'conceived in liberty' can be changed to 'founded on freedom' to use more common words.",
      confidence: 0.9
    },
    {
      line_number: 3,
      existing_text: 'Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure.',
      proposed_replacement: 'Now we are in a great civil war, testing if that nation, or any nation founded on such principles, can last.',
      reasoning: "The phrase 'engaged in a great civil war' can be simplified to 'in a great civil war.' 'So conceived and so dedicated' can be changed to 'founded on such principles' for clarity.",
      confidence: 0.9
    },
    {
      line_number: 3,
      existing_text: 'We are met on a great battlefield of that war. We have come to dedicate a portion of that field as a final resting place for those who here gave their lives that that nation might live.',
      proposed_replacement: 'We are here on a great battlefield of that war. We have come to set aside part of this field as a final resting place for those who gave their lives so that the nation might live.',
      reasoning: "The phrase 'We are met' can be simplified to 'We are here.' 'Dedicate a portion of that field' can be changed to 'set aside part of this field' for clarity.",
      confidence: 0.9
    },
    {
      line_number: 5,
      existing_text: 'But in a larger sense we cannot dedicate, we cannot consecrate, we cannot hallow this ground.',
      proposed_replacement: 'But in a larger sense, we cannot dedicate, bless, or make this ground holy.',
      reasoning: "The word 'consecrate' can be replaced with 'bless,' and 'hallow' can be replaced with 'make this ground holy' to use more common words.",
      confidence: 0.9
    },
    {
      line_number: 5,
      existing_text: 'The brave men, living and dead, who struggled here have consecrated it, far above our poor power to add or detract.',
      proposed_replacement: 'The brave men, living and dead, who fought here have already made it holy, far beyond our ability to add or take away.',
      reasoning: "The word 'struggled' can be replaced with 'fought,' and 'consecrated it' can be changed to 'made it holy' for clarity. 'Our poor power to add or detract' can be simplified to 'our ability to add or take away.'",
      confidence: 0.9
    },
    {
      line_number: 5,
      existing_text: 'The world will little note, nor long remember, what we say here, but it can never forget what they did here.',
      proposed_replacement: 'The world will not remember much of what we say here, but it will never forget what they did here.',
      reasoning: "The phrase 'will little note, nor long remember' can be simplified to 'will not remember much of' for clarity.",
      confidence: 0.9
    },
    {
      line_number: 5,
      existing_text: 'It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced.',
      proposed_replacement: 'It is for us, the living, to be dedicated to the unfinished work that those who fought here have so far advanced.',
      reasoning: "The phrase 'rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced' can be simplified to 'to be dedicated to the unfinished work that those who fought here have so far advanced' for clarity.",
      confidence: 0.9
    },
    {
      line_number: 7,
      existing_text: 'It is rather for us to be here dedicated to the great task remaining before us, that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion, that we here highly resolve that these dead shall not have died in vain, that this nation, under God, shall have a new birth of freedom, and that government of the people, by the people, for the people, shall not perish from the earth.',
      proposed_replacement: 'It is for us to be dedicated to the great task ahead of us. From these honored dead, we take more devotion to the cause for which they gave their lives. We resolve that these dead shall not have died in vain, that this nation, under God, shall have a new birth of freedom, and that government of the people, by the people, for the people, shall not disappear from the earth.',
      reasoning: "The sentence is very long and complex. Breaking it into shorter sentences and using simpler words like 'ahead of us' instead of 'remaining before us,' 'more devotion' instead of 'increased devotion,' and 'disappear' instead of 'perish' makes it more accessible.",
      confidence: 0.8
    }
  ]
}
```

#### Sample Output - claude-3-opus-20240229

```typescript
{
  thought_log: [
    "The text is the Gettysburg Address, a speech by Abraham Lincoln during the American Civil War. It is a deeply meaningful and important speech, but the language may be challenging for some readers.",
    "I should look for ways to make the language more accessible while preserving the meaning and gravity of the speech.",
    "I notice some longer, complex sentences that could potentially be broken up or simplified.",
    "There are also some less common words and phrases like 'consecrate', 'hallow', 'devotion' that could potentially be replaced with more common synonyms.",
    "I will go through and propose some targeted edits to improve readability and accessibility while being very careful not to change the core meaning."
  ],
  proposed_edits: [
    {
      line_number: 1,
      existing_text: 'Four score and seven years ago our fathers brought forth on this continent a new nation, conceived in liberty, and dedicated to the proposition that all men are created equal.',
      proposed_replacement: '87 years ago, our fathers started a new nation on this continent. It was based on freedom and the idea that all men are created equal.',
      reasoning: "Simplified '4 score and 7 years' to '87 years' and broke up long sentence for better readability. Replaced less common words like 'conceived' and 'proposition' with more accessible synonyms.",
      confidence: 0.8
    },
    {
      line_number: 3,
      existing_text: 'We are met on a great battlefield of that war.',
      proposed_replacement: 'We are meeting on an important battlefield of that war.',
      reasoning: "Small tweak to replace the less common phrasing 'we are met' with the more standard 'we are meeting'.",
      confidence: 0.9
    },
    {
      line_number: 5,
      existing_text: 'The brave men, living and dead, who struggled here have consecrated it, far above our poor power to add or detract.',
      proposed_replacement: 'The brave men, living and dead, who fought here have made it sacred, far more than we can add or take away.',
      reasoning: "Replaced 'consecrated' with 'made it sacred' and 'struggled' with 'fought' while preserving meaning. Simplified 'our poor power' to 'we'.",
      confidence: 0.7
    },
    {
      line_number: 5,
      existing_text: 'It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced.',
      proposed_replacement: 'Instead, we the living must dedicate ourselves to the unfinished work that the men who fought here have so nobly carried on.',
      reasoning: "Streamlined sentence structure and replaced phrase 'thus far so nobly advanced' with simpler synonym 'have so nobly carried on'.",
      confidence: 0.8
    },
    {
      line_number: 7,
      existing_text: 'that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion',
      proposed_replacement: 'that from these honored dead, we devote ourselves more fully to the cause they sacrificed everything for',
      reasoning: "Replaced less common phrase 'last full measure of devotion' with meaning-preserving plain language: 'sacrificed everything for'.",
      confidence: 0.8
    }
  ]
}
```

#### Sample Output - gemini-1.5-pro-latest

```typescript
{
  thought_log: [
    "I should start by reading through the text and looking for any sentences that are very long or complex.",
    "Sentence 7 is quite long. I should see if I can break it down into smaller, more manageable chunks.",
    "I also need to keep in mind the requirement to use common words. I'll make note of any complex vocabulary as I go."
  ],
  proposed_edits: [
    {
      line_number: 7,
      existing_text: "It is rather for us to be here dedicated to the great task remaining before us, that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion, that we here highly resolve that these dead shall not have died in vain, that this nation, under God, shall have a new birth of freedom, and that government of the people, by the people, for the people, shall not perish from the earth.",
      proposed_replacement: "We are here to finish the work of these brave soldiers. We must be more devoted to the cause they died for. We must decide that their deaths were not pointless. This nation, with God's help, will be reborn in freedom. Government of the people, by the people, for the people, will not disappear from the world.",
      reasoning: "This sentence is very long and complex. Breaking it down into smaller sentences makes it easier to understand. I've also tried to replace some of the less common words with simpler alternatives.",
      confidence: 0.8
    }
  ]
}
```

### Prebuilt Revision Nerd: CodeSnippetTunerNerd

This one is a bit tricky because we're running it against source texts that sometimes include intentionally incorrect code snippets. I've attempted to account for that. The goal here is to improve any code snippets found in a source text, where "improve" is defined fairly broadly. The [definition](./src/prebuilt/revision/code_snippet_tuner_nerd.ts) is here and we can continue to tweak it. The output you'll receive looks like this:

```typescript
{
  thought_log: [
    'First, I will review the code snippets to ensure they are correct and idiomatic.',
    'I will check for consistency in variable names and ensure the code demonstrates what the text describes.',
    'I will also add comments to any code snippets whose clarity is in question.'
  ],
  proposed_edits: [
    {
      line_number: 23,
      existing_text: 'type: "button";',
      proposed_replacement: 'type: "button",',
      reasoning: 'In JavaScript/TypeScript object literals, properties should be separated by commas, not semicolons. This is a syntax error.',
      confidence: 1
    },
    {
      line_number: 33,
      existing_text: 'type: "button";',
      proposed_replacement: 'type: "button",',
      reasoning: 'In JavaScript/TypeScript object literals, properties should be separated by commas, not semicolons. This is a syntax error.',
      confidence: 1
    },
    {
      line_number: 77,
      existing_text: 'buttonAttributes.type = "button";',
      proposed_replacement: 'buttonAttributes.type = "submit";',
      reasoning: "The text states that the `type` property can be modified to one of the allowed literal types. Changing it to 'submit' demonstrates this more clearly.",
      confidence: 1
    }
  ]
}
```

#### Sample Output - claude-3-opus-20240229

````typescript
{
  thought_log: [
    'The code snippets seem to be correct and demonstrate the points being made in the text.',
    "The variable names are consistent and meaningful, like 'buttonAttributes' and 'modifyButton'.",
    "The snippets show how 'as const' can be used to infer string literals as types in objects.",
    'There are a couple minor improvements that could be made for clarity.',
    'Overall the snippets are in good shape and serve their purpose well.'
  ],
  proposed_edits: [
    {
      line_number: 23,
      existing_text: 'type: "button";',
      proposed_replacement: 'type: "button"',
      reasoning: 'The semicolon at the end of the line is not needed in this object literal.',
      confidence: 0.95
    },
    {
      line_number: 46,
      existing_text: 'type: "button" as const;',
      proposed_replacement: 'type: "button" as const',
      reasoning: 'The semicolon at the end of the line is not needed in this object literal.',
      confidence: 0.95
    },
    {
      line_number: 76,
      existing_text: '```typescript',
      proposed_replacement: '```typescript\n' +
        '// This is valid\n' +
        'buttonAttributes.type = "button";\n' +
        '\n' +
        '// This would be an error\n' +
        '// buttonAttributes.type = "invalid"; \n' +
        '```',
      reasoning: 'Adding a comment and showing an invalid assignment would help demonstrate the point being made about literal types.',
      confidence: 0.9
    }
  ]
}
````

#### Sample Output - gemini-1.5-pro-latest

This one glitched out, here's an error output.

````
OutputParserException [Error]: Error parsing JSON output
    at JsonNerdOutputParser.parse (file:///C:/Users/mbilo/Documents/GitHub/nerds-ai/build/src/internals/parsers/json/index.js:36:19)
    at OutputFixingParser.parse (file:///C:/Users/mbilo/Documents/GitHub/nerds-ai/node_modules/langchain/dist/output_parsers/fix.js:81:40)
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async NerdBinding.invoke (file:///C:/Users/mbilo/Documents/GitHub/nerds-ai/build/src/nerd.js:93:16)
    at async run (file:///C:/Users/mbilo/Documents/GitHub/nerds-ai/scripts/simple/_runner.mjs:28:21)
    at async main (file:///C:/Users/mbilo/Documents/GitHub/nerds-ai/scripts/simple/code_snippet_tuner_nerd.mjs:12:56) {
  llmOutput: '{\n' +
    '\t"thought_log": [\n' +
    '\t\t"The first code snippet looks fine, it defines a type and a function that uses it.",\n' +
    `\t\t"The second snippet is meant to show an error, so I'll leave it alone.",\n` +
    `\t\t"The third snippet is correct and demonstrates the use of 'as const' to make the object read-only.",\n` +
    `\t\t"The fourth snippet is also correct and shows how to apply 'as const' to a single property.",\n` +
    '\t\t"The fifth snippet is just showing the type inference, so no changes needed.",\n' +
    `\t\t"The sixth snippet is interesting - it shows how to use 'as const' in an array of objects. I'll add a comment to clarify that.",\n` +
    `\t\t"The seventh snippet seems to contradict the text. It says we can modify the 'type' property, but that shouldn't be possible if it's inferred as a literal type. I'll flag this for review."\n` +
    '\t],\n' +
    '\t"proposed_edits": [{\n' +
    '\t\t\t"line_number": 61,\n' +
    '\t\t\t"existing_text": "```typescript\\n62|\tconst modifyButtons = (attributes: ButtonAttributes[]) => {};\\n63|\t\\n64|\tconst buttonsToChange = [\\n65|\t  {\\n66|\t    type: \\"button\\" as const,\\n67|\t  },\\n68|\t  {\\n69|\t    type: \\"submit\\" as const,\\n70|\t  },\\n71|\t];\\n72|\t```",\n' +
    '\t\t\t"proposed_replacement": "```typescript\\n62|\tconst modifyButtons = (attributes: ButtonAttributes[]) => {};\\n63|\t\\n64|\tconst buttonsToChange = [\\n65|\t  {\\n66|\t    type: \\"button\\" as const,\\n67|\t  },\\n68|\t  {\\n69|\t    type: \\"submit\\" as const,\\n70|\t  },\\n71|\t];\\n72|\t// In this array, each \'type\' property is inferred as its literal type due to \'as const\'.\\n73|\t```",\n' +
    `\t\t\t"reasoning": "Adding a comment to clarify the effect of 'as const' in the array of objects.",\n` +
    '\t\t\t"confidence": 0.9\n' +
    '\t\t},\n' +
    '\t\t{\n' +
    '\t\t\t"line_number": 76,\n' +
    '\t\t\t"existing_text": "```typescript\\n77|\tbuttonAttributes.type = \\"button\\";\\n78|\t```",\n' +
    '\t\t\t"proposed_replacement": "```typescript\\n77|\t// buttonAttributes.type = \\"submit\\";  // This would be an error, as \'type\' is now a literal type.\\n78|\t```",\n' +
    `\t\t\t"reasoning": "The text claims we can modify the 'type' property, but this should be an error if it's inferred as a literal type. I'm replacing the code with an example that demonstrates the expected behavior and adding a comment to explain.",\n` +
    '\t\t\t"confidence": 0.7\n' +
    '\t\t}\n' +
    '\t]\n' +
    '}',
  observation: 'Please return your output in compliance with the JSON schema below.\n' +
    '\n' +
    'Note that your output has space for a "thought_log" array of strings. To populate this array, you should think deeply about the task at hand.\n' +
    'Ask yourself "What should I do next? Why?" and then answer that question as specifically as you can.\n' +
    'Repeat this process as you go about your task, making sure to document your thoughts in the "thought_log" array.\n' +
    '\n' +
    'Your final response, including the log of your thoughts, should be a single JSON object that implements the typescript type defined below.\n' +
    'Please DO NOT wrap your response in any kind of text or code fence, it is essential that you return valid JSON that is machine parsable.\n' +
    "The first character of your output MUST be '{' and the last character MUST be '}', and the entire content should be a properly-escaped JSON object. \n" +
    '\n' +
    "Please double check that your response starts with '{' and ends with '}'.\n" +
    '\n' +
    'Output Schema:\n' +
    '\n' +
    '{\n' +
    '  // the "thought_log" array is for tracking your own thoughts as you carry out your task.\n' +
    '  // Please log your process and observations here as you go, ensuring to keep your thoughts in order.\n' +
    '  // Use these thoughts as you complete your task to help you stay focused.\n' +
    '  "thought_log": string[],\n' +
    '\n' +
    '  // return as many proposed edits as you can so long as you are confident that they serve the needs of the operation requested.\n' +
    '  "proposed_edits": [{\n' +
    "    // the line number in the source document where the text you'd like to replace starts. Note that the text should be annotated with an\n" +
    '    // integer followed by a pipe character and a tab. When proposing revisions, please base use these annotations as the basis for your line numbers.\n' +
    '    line_number: number\n' +
    '\n' +
    "    // the specific text from the source document that you'd like to replace. this should be identifiable via string matching, it must be exact.\n" +
    '    // note that the text may have been annotated with line numbers at the start of each line - please leave these annotations out of your selection.\n' +
    '    "existing_text": string\n' +
    '\n' +
    '    // offer a string of text to replace the selection above. An empty string is a valid value for removal.\n' +
    '    "proposed_replacement": string\n' +
    '\n' +
    '    // explain why you are proposing this edit\n' +
    '    "reasoning": string\n' +
    '\n' +
    `    // set this to true if there are multiple matches on the issue you're flagging. If so, your "existing_text" should match them all.\n` +
    `    // You may leave this out entirely if it's false.` +
    '    "multiple_matches": boolean\n' +
    '\n' +
    "    // a value from 0-1 expressing how certain you are that the edit you're proposing is necessary and correct.\n" +
    '    // your other instructions may give you guidance for determining this value in a given operation.\n' +
    '    "confidence": number\n' +
    '  }]\n' +
    '}',
  sendToLLM: true
}
````

### Prebuilt Revision Nerd: PersonalityNerd

This one is more playful, but potentially useful if you want to tweak the tone of a given text. Basically you invoke it by passing in a personality defined in some way. The nerd proposes edits to make it feel as if the document was written by someone with the given personality. It makes use of the second optional input argumennt, "runtime_instructions", to allow you to specify the personality at runtime. If you forget you'll get Deadpool and he'll use fourth-wall violations to remind you to parameterize the nerd. The [definition is here](./src/prebuilt/revision/personality_nerd.ts) and the output looks like this. In this example, we're having a Klington warrior interpret the Gettysburg Address:

#### Sample Output - gpt-4o

```typescript
{
  thought_log: [
    "First, I need to identify key phrases and concepts that can be rephrased to reflect a Klingon warrior's perspective.",
    'Klingon culture values honor, battle, and glory, so I should incorporate these elements into the text.',
    'I will start with the opening line and work my way through the document, making sure to maintain the original meaning while adding a Klingon cultural lens.'
  ],
  proposed_edits: [
    {
      line_number: 1,
      existing_text: 'Four score and seven years ago our fathers brought forth on this continent a new nation, conceived in liberty, and dedicated to the proposition that all men are created equal.',
      proposed_replacement: 'Many cycles of the moon ago, our forebears forged a new empire on this land, conceived in the fires of freedom, and dedicated to the honor that all warriors are born equal.',
      reasoning: 'Rephrased to reflect the Klingon values of honor and the concept of an empire rather than a nation.',
      confidence: 1
    },
    {
      line_number: 3,
      existing_text: 'Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure.',
      proposed_replacement: 'Now we are locked in a mighty civil war, testing whether this empire, or any empire so forged and so dedicated, can endure the trials of battle.',
      reasoning: "Changed 'great' to 'mighty' and 'nation' to 'empire' to reflect Klingon terminology and emphasis on battle.",
      confidence: 1
    },
    {
      line_number: 3,
      existing_text: 'We are met on a great battlefield of that war.',
      proposed_replacement: 'We stand upon a glorious battlefield of this war.',
      reasoning: "Replaced 'great' with 'glorious' to emphasize the Klingon reverence for battle.",
      confidence: 1
    },
    {
      line_number: 3,
      existing_text: 'We have come to dedicate a portion of that field as a final resting place for those who here gave their lives that that nation might live.',
      proposed_replacement: 'We have come to honor a part of this field as the final resting place for those who gave their lives so that this empire might live.',
      reasoning: 'Rephrased to emphasize honor and the concept of an empire.',
      confidence: 1
    },
    {
      line_number: 5,
      existing_text: 'But in a larger sense we cannot dedicate, we cannot consecrate, we cannot hallow this ground.',
      proposed_replacement: 'But in a greater sense, we cannot dedicate, we cannot consecrate, we cannot sanctify this ground.',
      reasoning: "Changed 'larger' to 'greater' and 'hallow' to 'sanctify' to reflect a more epic tone.",
      confidence: 1
    },
    {
      line_number: 5,
      existing_text: 'The brave men, living and dead, who struggled here have consecrated it, far above our poor power to add or detract.',
      proposed_replacement: 'The valiant warriors, living and dead, who fought here have consecrated it, far beyond our meager power to add or detract.',
      reasoning: "Replaced 'brave men' with 'valiant warriors' and 'poor' with 'meager' to reflect Klingon valor and humility.",
      confidence: 1
    },
    {
      line_number: 5,
      existing_text: 'The world will little note, nor long remember, what we say here, but it can never forget what they did here.',
      proposed_replacement: 'The galaxy will scarcely note, nor long remember, what we say here, but it will never forget the glory of their deeds.',
      reasoning: "Expanded 'world' to 'galaxy' and emphasized the glory of deeds to reflect a grander, more epic scale.",
      confidence: 1
    },
    {
      line_number: 5,
      existing_text: 'It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced.',
      proposed_replacement: 'It is for us, the living, to be dedicated here to the unfinished battle which they who fought here have so nobly advanced.',
      reasoning: "Changed 'work' to 'battle' to reflect the Klingon focus on combat.",
      confidence: 1
    },
    {
      line_number: 7,
      existing_text: 'It is rather for us to be here dedicated to the great task remaining before us, that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion, that we here highly resolve that these dead shall not have died in vain, that this nation, under God, shall have a new birth of freedom, and that government of the people, by the people, for the people, shall not perish from the earth.',
      proposed_replacement: 'It is for us to be here dedicated to the mighty task remaining before us, that from these honored dead we take increased devotion to the cause for which they gave the last full measure of honor, that we here resolve that these warriors shall not have died in vain, that this empire, under the gaze of Kahless, shall have a new birth of freedom, and that the rule of the people, by the people, for the people, shall not perish from the galaxy.',
      reasoning: 'Rephrased to reflect Klingon values of honor, the influence of Kahless, and an epic scale.',
      confidence: 1
    }
  ]
}
```

#### Sample Output - claude-3-opus-20240229

```typescript
{
  thought_log: [
    "The document seems to be a famous speech from American history, the Gettysburg Address by Abraham Lincoln. To view it through a Klingon lens, I'll need to find ways to make it sound more like a Klingon battle speech.",
    'Klingons are a warrior race that values honor and glory in battle above all else. I should look for opportunities to emphasize the heroic sacrifices of the fallen and the glory of dying in battle.',
    "Klingons express emotion very directly and forcefully. The language should be blunt and aggressive. I'll replace flowery phrases with more direct statements.",
    "Consecrating or dedicating land is not a very Klingon concept. They would be more focused on remembering the warriors' deeds. I'll downplay references to dedicating the battlefield.",
    'For Klingons, dying in battle is the highest honor. I should amp up language around the dead giving their lives for a glorious cause worthy of remembrance.',
    "Government 'of the people, by the people, for the people' doesn't resonate with Klingon values. I'll reframe it in terms of the fallen warriors' legacy living on through the honorable continuation of their fight."
  ],
  proposed_edits: [
    {
      line_number: 1,
      existing_text: 'Four score and seven years ago our fathers brought forth on this continent a new nation, conceived in liberty, and dedicated to the proposition that all men are created equal.',
      proposed_replacement: 'Many years ago, our warrior ancestors forged an empire on this planet, born in the fires of glorious revolution, built on the promise that all warriors can achieve equal glory in battle.',
      reasoning: 'Rephrases the opening to sound more like a Klingon relating the exploits of honored warrior ancestors. Substitutes liberty and equality with glory in battle, a more Klingon ideal.',
      confidence: 0.8
    },
    {
      line_number: 3,
      existing_text: 'We have come to dedicate a portion of that field as a final resting place for those who here gave their lives that that nation might live.',
      proposed_replacement: 'We gather to honor this ground as the eternal monument to those warriors who met the highest calling, giving their lives so that the empire would conquer. Their sacrifice demands our fiercest tribute.',
      reasoning: "Klingons would focus more on honoring the warriors' sacrifice than on dedicating the land. Dying so the empire/nation endures is the most honorable death.",
      confidence: 0.85
    },
    {
      line_number: 5,
      existing_text: 'The brave men, living and dead, who struggled here have consecrated it, far above our poor power to add or detract. The world will little note, nor long remember, what we say here, but it can never forget what they did here.',
      proposed_replacement: 'The courageous warriors, both victorious and vanquished, have forever marked this place with their valor, beyond any words we might offer. History may not record our speech, but their deeds will never be forgotten, etched in blood and blade for all time.',
      reasoning: "Consecration isn't very Klingon, so I've reframed it around the warriors' courageous deeds being what makes the ground significant. Puts more emphasis on their actions over any words spoken.",
      confidence: 0.9
    },
    {
      line_number: 7,
      existing_text: 'It is rather for us to be here dedicated to the great task remaining before us, that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion, that we here highly resolve that these dead shall not have died in vain, that this nation, under God, shall have a new birth of freedom, and that government of the people, by the people, for the people, shall not perish from the earth.',
      proposed_replacement: 'Our duty is to commit ourselves fully to the glorious battle still to come. Let the spirits of the fallen fuel our valor, so their sacrifice will achieve its aim. On our honor, we swear their deaths were not in vain. This empire will rise in conquered glory, and the enemy will fall before us. The legacy of these warriors will endure as long as Klingons still fight and breathe!',
      reasoning: "Reframes the final charge in terms of committing to the ongoing battle/war. Sees the sacrifices as fuel for further conquest, not for some new freedom - Klingons wouldn't relate to that. Changes the final lines to be about the fallen warriors' legacy living on through further battles, not about government of/by/for the people. Much more aggressive and warlike overall.",
      confidence: 0.75
    }
  ]
}
```

#### Sample Output - gemini-1.5-pro-latest

This one glitched a bit - it correctly received the runtime instructions, but also seems to believe that it didn't. So it does what's asked but then also throws in a "default" comment from the deadpool personality. LLM's, eh?

```typescript
{
  thought_log: [
    "The user didn't give me a personality! Time to break the fourth wall and teach them how to use this thing.",
    'I need to figure out how to make this sound like a Klingon is giving the Gettysburg Address.  Glory in battle is important to Klingons, so I should probably emphasize that.',
    'Klingons are very direct, so I should remove some of the more flowery language.'
  ],
  proposed_edits: [
    {
      line_number: 1,
      existing_text: 'Four score and seven years ago our fathers brought forth on this continent a new nation, conceived in liberty, and dedicated to the proposition that all men are created equal.',
      proposed_replacement: 'Eighty-seven years ago, warriors of the past established a new nation on this land. They believed in freedom and the equality of all.',
      reasoning: 'This phrasing is more direct and emphasizes the warrior spirit of the founders.',
      confidence: 0.9
    },
    {
      line_number: 3,
      existing_text: 'Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battlefield of that war. We have come to dedicate a portion of that field as a final resting place for those who here gave their lives that that nation might live. It is altogether fitting and proper that we should do this.',
      proposed_replacement: "We are now locked in a bloody conflict, a true test of this nation's strength. We stand on a field of battle, where many warriors have fallen. We honor them by dedicating this ground as their final resting place. It is our duty to do so.",
      reasoning: 'This emphasizes the conflict and the honor in dying in battle, which are important Klingon values.',
      confidence: 0.85
    },
    {
      line_number: 5,
      existing_text: 'But in a larger sense we cannot dedicate, we cannot consecrate, we cannot hallow this ground. The brave men, living and dead, who struggled here have consecrated it, far above our poor power to add or detract. The world will little note, nor long remember, what we say here, but it can never forget what they did here. It is for us the living, rather, to be dedicated here to the unfinished work which they who fought here have thus far so nobly advanced.',
      proposed_replacement: 'We cannot truly dedicate this ground. The warriors who fought and died here have already done so. Their actions will be remembered long after our words are forgotten. It is our duty to continue their fight.',
      reasoning: 'This is a more direct and action-oriented way of expressing the same sentiment.',
      confidence: 0.8
    },
    {
      line_number: 7,
      existing_text: 'It is rather for us to be here dedicated to the great task remaining before us, that from these honored dead we take increased devotion to that cause for which they gave the last full measure of devotion, that we here highly resolve that these dead shall not have died in vain, that this nation, under God, shall have a new birth of freedom, and that government of the people, by the people, for the people, shall not perish from the earth.',
      proposed_replacement: 'We must honor these fallen warriors by continuing their fight. We must ensure that their sacrifices were not in vain. This nation will be reborn in freedom! We will ensure that government by the people will never die!',
      reasoning: "This is a more passionate and forceful way of expressing the same sentiment, and it removes the reference to God, which wouldn't be appropriate for a Klingon.",
      confidence: 0.75
    },
    {
      line_number: 8,
      existing_text: '',
      proposed_replacement: "Hey, uh, human using this program! You forgot to tell me what personality to use! So I'm going with my default: a glorious Klingon warrior!  Qapla'!",
      reasoning: 'Gotta break the fourth wall and let the user know they messed up.',
      confidence: 1
    }
  ]
}
```

### Prebuilt Revision Nerd: TypoNerd

This one is very basic, it just seeks to identify typos in a given text. Honestly this is probably not the best use of LLMs since we already have spellcheck, but it was trivial to throw together and test so here we are. Definition is [here](./src/prebuilt/revision/typo_nerd.ts) and sample output is here:

#### Sample Output - gpt-4o

```typescript
{
  thought_log: [
    'Starting to review the text for any typos or mechanical errors.',
    'Checking line 1 for any issues.',
    'Line 1 appears to be correct.',
    'Checking line 2 for any issues.',
    'Line 2 is empty, moving on.',
    'Checking line 3 for any issues.',
    "Noticed 'that that nation' which seems repetitive. Considering if it's intentional or a typo.",
    "Decided to propose a change for 'that that nation' to 'that the nation' for clarity.",
    'Checking line 4 for any issues.',
    'Line 4 is empty, moving on.',
    'Checking line 5 for any issues.',
    'Line 5 appears to be correct.',
    'Checking line 6 for any issues.',
    'Line 6 is empty, moving on.',
    'Checking line 7 for any issues.',
    'Line 7 appears to be correct.',
    'Checking line 8 for any issues.',
    'Line 8 is empty, moving on.',
    'Finished reviewing the text.'
  ],
  proposed_edits: [
    {
      line_number: 3,
      existing_text: 'that that nation',
      proposed_replacement: 'that the nation',
      reasoning: "The phrase 'that that nation' seems repetitive and could be a typo. Changing it to 'that the nation' improves clarity.",
      confidence: 0.9
    }
  ]
}
```

#### Sample Output - claude-3-opus-20240229

```typescript
{
  thought_log: [
    'I will carefully review the entire text from top to bottom, looking for any typos, misspellings, or mechanical errors.',
    'The text appears to be a famous speech, likely the Gettysburg Address by Abraham Lincoln. I will be mindful not to make any semantic or stylistic changes, only correcting clear errors.',
    'Each line is annotated with a line number, a pipe character, and a tab. I will use these line numbers in my proposed edits.',
    'I do not see any obvious typos or misspellings in the first paragraph.',
    'The second paragraph also appears to be free of mechanical errors.',
    "In the third paragraph, the phrase 'nor long remember' reads a bit awkwardly, but this seems to be an intentional rhetorical choice rather than an error.",
    'The fourth paragraph looks clean as well, with no typos that I can identify.',
    'After reviewing the entire document carefully, I did not find any mechanical errors that need correction. The text appears to be a verbatim and correct transcription of the Gettysburg Address.',
    "Since I have no edits to suggest, I will return an empty array for 'proposed_edits' to indicate that no changes are needed."
  ],
  proposed_edits: []
}
```

#### Sample Output - gemini-1.5-pro-latest

```typescript
{
  thought_log: [
    'I should start by scanning the entire document for any misspellings.',
    'Next I should check for any missing words, as this is a common error.',
    "I'll need to pay close attention to individual characters to make sure they are used correctly in their context.",
    'I should ensure that acronyms and domain-specific vocabulary are used consistently throughout the text.',
    "Punctuation is important for clarity, so I'll need to verify that it is used correctly.",
    "Finally, I'll double check the entire text from top to bottom to ensure I haven't missed anything."
  ],
  proposed_edits: [
    {
      line_number: 3,
      existing_text: 'that that nation',
      proposed_replacement: 'that the nation',
      reasoning: "It appears that the word 'that' is repeated unnecessarily. I propose changing 'that that' to 'that the'.",
      confidence: 0.9
    },
    {
      line_number: 5,
      existing_text: 'It is for us the living, rather',
      proposed_replacement: 'It is for us, the living, rather',
      reasoning: "Adding a comma after 'us' would improve clarity and separate the phrase 'the living' more distinctly.",
      confidence: 0.6
    }
  ]
}
```

### Prebuilt Findings Nerd: WikipediaResearchNerd

This is more of a demo of using tools than a functionally useful nerd itself. This nerd is instructed to have ADHD and go down a wikipedia rabbit hole researching a given prompt, so the result can be a bit random. I used "the minions" as my initial prompt. Unlike the revisions nerds above, a Findings nerd just returns a list of findings. The source is [here](./src/prebuilt/findings/wikipedia_research_nerd.ts) and the output looks like this:

#### Sample Output - gpt-4o

```typescript
{
  thought_log: [
    "I started by querying Wikipedia for 'Hermetic Tradition' and received a detailed summary of Hermeticism.",
    'The summary mentioned several key elements and figures related to Hermeticism, such as Hermes Trismegistus, the Corpus Hermeticum, the Emerald Tablet, and Frances A. Yates.',
    'To gather more detailed information, I decided to query Wikipedia for each of these elements individually.',
    "I queried for 'Hermes Trismegistus' and received a summary detailing his origins, identity, and significance in Hermeticism.",
    "I queried for 'Corpus Hermeticum' and received a summary about its contents, historical background, and influence.",
    "I queried for 'Emerald Tablet' and received a summary about its text, history, and significance in alchemy.",
    "I queried for 'Frances A. Yates' and received a summary about her life, work, and contributions to the study of Hermeticism."
  ],
  findings: [
    'Hermeticism is a philosophical and religious system based on the teachings of Hermes Trismegistus, a combination of the Greek god Hermes and the Egyptian god Thoth. [https://en.wikipedia.org/wiki/Hermeticism]',
    'The Corpus Hermeticum is a collection of 17 Greek writings attributed to Hermes Trismegistus, written between c. 100 and c. 300 CE, and translated into Latin in the 15th century. [https://en.wikipedia.org/wiki/Corpus_Hermeticum]',
    "The Emerald Tablet is a cryptic Hermetic text attributed to Hermes Trismegistus, foundational for many alchemists, and known for the phrase 'as above, so below.' [https://en.wikipedia.org/wiki/Emerald_Tablet]",
    "Frances A. Yates was an English historian who emphasized the role of Hermeticism in Renaissance thought, particularly in her work 'Giordano Bruno and the Hermetic Tradition.' [https://en.wikipedia.org/wiki/Frances_Yates]",
    'Hermes Trismegistus is a legendary figure combining Hermes and Thoth, associated with wisdom and the authorship of the Hermetica. [https://en.wikipedia.org/wiki/Hermes_Trismegistus]',
    'The Hermetic tradition includes a wide array of early modern philosophies inspired by translations of the Corpus Hermeticum and the works of Paracelsus. [https://en.wikipedia.org/wiki/Hermeticism]',
    "The idea of a 'prisca theologia' or 'ancient theology' in Hermeticism suggests a single, true theology given by God to ancient sages, which can be found in various ancient systems of thought. [https://en.wikipedia.org/wiki/Hermeticism]",
    'The Hermetic literature among the Egyptians included conjuring spirits and animating statues, influencing Greco-Babylonian astrology and alchemy. [https://en.wikipedia.org/wiki/Hermes_Trismegistus]',
    'The Latin translation of the Corpus Hermeticum by Marsilio Ficino and Lodovico Lazzarelli had a profound impact on Renaissance thought and culture. [https://en.wikipedia.org/wiki/Corpus_Hermeticum]',
    'The Emerald Tablet has been found in various ancient Arabic works and was rediscovered in the early 20th century by historians of science. [https://en.wikipedia.org/wiki/Emerald_Tablet]'
  ]
}
```

#### Sample Output - claude-3-opus-20240229

```typescript
{
  thought_log: [
    'Searched Wikipedia for overview of Hermeticism which provided helpful historical and conceptual background on the origins and development of the tradition. Noted some areas that could still use more detail.',
    'Looked up the Corpus Hermeticum specifically to get more info on the core Hermetic texts - learned about their dating, content, and influence especially after their translation in the Renaissance. This filled in key gaps.',
    'Searched Hermes Trismegistus to better understand the legendary founder figure of Hermeticism. Provided useful context on his mythic origins and significance.',
    'Looked into the Hermetic Order of the Golden Dawn to learn how Hermeticism evolved and spread in the modern occult revival of the 19th/20th centuries, tracing its influence to the present.',
    'Finally searched prisca theologia to understand how Hermetic texts were viewed in the Renaissance as an ancient universal wisdom, which explained their receptiveness and impact in that period.',
    'In summarizing my findings, aimed to cover the origins, key texts, major beliefs, and historical significance of Hermeticism over time. Feel the collection of articles researched provides a thorough overview addressing the core aspects of the topic.'
  ],
  findings: [
    'The Hermetic tradition originated in Hellenistic Egypt as a syncretic combination of Greek and Egyptian religious and philosophical ideas, centered on the legendary figure of Hermes Trismegistus (a fusion of the Greek god Hermes and Egyptian god Thoth).',
    'The core Hermetic texts are the Corpus Hermeticum, a collection of 17 Greek treatises written between the 1st-3rd centuries CE and first compiled in the Middle Ages. These texts, presented as dialogues involving Hermes, deal with theological and philosophical questions about the divine, the cosmos, the mind, and more.',
    "When Marsilio Ficino translated the Corpus Hermeticum into Latin in the 15th century, it sparked a major revival of interest in Hermeticism during the Renaissance. Hermes Trismegistus was seen as an ancient sage who possessed a primordial and universal wisdom known as the 'prisca theologia.' As a result, the Hermetic teachings deeply influenced many Renaissance thinkers and contributed to the growth of Western esotericism.",
    'In the 19th century, Hermetic concepts experienced another revival via occult groups like the Hermetic Order of the Golden Dawn. The Golden Dawn developed elaborate rituals and practices drawing from Hermeticism as well as Kabbalah, Tarot, alchemy, astrology and other esoteric traditions. Its teachings would go on to shape much of modern occultism and Paganism.',
    'Some key beliefs and practices traditionally associated with Hermeticism include: A focus on personal spiritual transformation and the pursuit of gnosis or divine knowledge, use of magic, alchemy, and astrology as means for interacting with the divine and harnessing cosmic forces, belief in a transcendent God and a hierarchical cosmos that includes various intermediary beings like stars and angels, the idea of human minds as divine sparks trapped in the material world that can be liberated through spiritual development, and an esoteric reading of religious myths and images to reveal their hidden allegorical meanings.'
  ]
}
```

#### Sample Output - gemini-1.5-pro-latest

```typescript
{
  thought_log: [
    'Okay, so I need to learn about the Hermetic Tradition and return information as a list of strings with citations. Hmmm, this sounds like fun! I love learning new things!',
    `First things first, I need to get some information from Wikipedia. I'll use the wikipedia-api to search for "Hermetic Tradition".`,
    'Okay, cool. The wikipedia-api returned a page about the Hermetic Tradition. Let me see what it says.',
    "Wow, there's a lot of information here! This is so cool! Okay, so the Hermetic Tradition is a philosophical and religious tradition based on the writings attributed to Hermes Trismegistus. It's influenced by Egyptian and Greek thought. This is fascinating!",
    "Oh, look! There's a link to Hermeticism. I wonder what that's all about. I'm going to follow that link.",
    "Hermeticism is a branch of Western esotericism. It's based on the Hermetica, which are texts attributed to Hermes Trismegistus. This is getting really interesting!",
    "Oh, wow! There's a link to Alchemy. I've always been fascinated by alchemy! I'm going to follow that link.",
    "Alchemy is an ancient branch of natural philosophy. It's about transmuting base metals into gold. This is so cool! I'm learning so much!",
    "Okay, I think I have enough information for now. I'm going to return what I've found."
  ],
  findings: [
    'The Hermetic Tradition is a philosophical and religious tradition based primarily upon writings attributed to Hermes Trismegistus. (https://en.wikipedia.org/wiki/Hermetic_Tradition)',
    'The Hermetic Tradition is rooted in Greco-Egyptian Antiquity and influenced by Egyptian and Greek thought. (https://en.wikipedia.org/wiki/Hermetic_Tradition)',
    'Hermeticism is a branch of Western esotericism. (https://en.wikipedia.org/wiki/Hermeticism)',
    'Hermeticism is based primarily upon the Hermetica, a collection of texts attributed to Hermes Trismegistus, a syncretic combination of the Greek god Hermes and the Egyptian god Thoth. (https://en.wikipedia.org/wiki/Hermeticism)',
    'Alchemy is an ancient branch of natural philosophy, a philosophical and protoscientific tradition practiced throughout Europe, Africa, and Asia, originating in Greco-Roman Egypt in the first few centuries CE. (https://en.wikipedia.org/wiki/Alchemy)'
  ]
}
```

### Prebuilt Findings Nerd: ConceptExtractorNerd

This is the most complex nerd yet. It's wired up to a pinecone backend. You give it a content domain and it seeks to extract concepts related to that domain from a given text. Instead of just returning the concepts, though, first it checks them against a vector store that contains a list of canonical concepts. If an existing concept would suffice instead of an extracted one it replaces the initial suggestion with the canonical one. Then it writes all new concepts to the concept store and returns the final list. The source is [here](./src/prebuilt/findings/vector_backed_concept_nerd.ts) and the result looks like this. All returned concepts are in pinecone, too.

**note**: in practice we probably don't want the nerd to write to pinecone, that should be a separate step. But I wanted to make sure that it could, as much for proof-of-concept reasons as anything else. This all works as described.

#### Sample Output - gpt-4o

```typescript
{
  thought_log: [
    "I have extracted the following concepts: 'Gettysburg Address', 'Civil War', 'battlefield', 'Abraham Lincoln', 'new nation', 'liberty', 'equality', 'final resting place', 'consecrate', 'hallow', 'unfinished work', 'honored dead', 'new birth of freedom', 'government of the people, by the people, for the people'.",
    'I used the existingConceptFinder tool to check if any of these concepts already exist in the store, but it returned no matches.',
    'Since none of the concepts were already in the store, I added all of them to the store using the addConceptsToStore tool.',
    'All 14 concepts have been successfully added to the store.'
  ],
  findings: [
    'Gettysburg Address',
    'Civil War',
    'battlefield',
    'Abraham Lincoln',
    'new nation',
    'liberty',
    'equality',
    'final resting place',
    'consecrate',
    'hallow',
    'unfinished work',
    'honored dead',
    'new birth of freedom',
    'government of the people, by the people, for the people'
  ]
}
```

#### Sample Output - claude-3-opus-20240229

```typescript
{
  thought_log: [
    'Read through the text, highlighting terms that capture important ideas or objects related to historical artifacts.',
    'Used existingConceptFinder to look for similar existing concepts for each highlighted term. No matches found.',
    'Since there were no matches, decided to use all the original concepts extracted.',
    'Added the 7 new concepts to the knowledge base using addConceptsToStore.',
    'Compiled my final list of concepts from the text.'
  ],
  findings: [
    'new nation',
    'liberty',
    'civil war',
    'battlefield',
    'resting place',
    'brave men',
    'freedom'
  ]
}
```

#### Sample Output - gemini-1.5-pro-latest

```typescript
{
  thought_log: [
    'The text is about the Gettysburg Address, a speech about the American Civil War. I should extract concepts related to this.',
    "I see the concepts 'Gettysburg Address', 'American Civil War', 'battlefield', and 'nation'. I'll check if these exist in the store using existingConceptFinder.",
    "existingConceptFinder Tool Result: { 'Gettysburg Address': ['Gettysburg Address'], 'American Civil War': ['American Civil War'], 'battlefield': ['Battlefield'], 'nation': ['Nation'] }",
    "All of these concepts already exist in the store. I'll replace the extracted concepts with the existing ones.",
    'There are no new concepts to add to the store.',
    "My final list of concepts is: ['Gettysburg Address', 'American Civil War', 'Battlefield', 'Nation']."
  ],
  findings: [
    'Gettysburg Address',
    'American Civil War',
    'Battlefield',
    'Nation'
  ]
}
```
