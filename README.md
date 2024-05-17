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
      "multiple_matches?": false,
      "confidence": 0.9
    },
    {
      "line_number": 1,
      "existing_text": "Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure.",
      "proposed_replacement": "Now we are in a great civil war, testing if that nation, or any nation with such beliefs, can last.",
      "reasoning": "Breaks down the complex sentence and uses simpler words.",
      "multiple_matches?": false,
      "confidence": 0.9
    },
    {
      "line_number": 1,
      "existing_text": "We are met on a great battlefield of that war.",
      "proposed_replacement": "We are here on a major battlefield of that war.",
      "reasoning": "Simplifies the phrase and makes it more direct.",
      "multiple_matches?": false,
      "confidence": 0.95
    },
    {
      "line_number": 1,
      "existing_text": "We have come to dedicate a portion of that field, as a final resting place for those who here gave their lives that that nation might live.",
      "proposed_replacement": "We have come to set aside part of this field as a final resting place for those who gave their lives so that the nation might live.",
      "reasoning": "Breaks down the long sentence and uses simpler words.",
      "multiple_matches?": false,
      "confidence": 0.9
    },
    {
      "line_number": 1,
      "existing_text": "It is altogether fitting and proper that we should do this.",
      "proposed_replacement": "It is right and proper that we do this.",
      "reasoning": "Simplifies the phrase and makes it more direct.",
      "multiple_matches?": false,
      "confidence": 0.95
    }
  ]
}
```

### Creating Your Own Nerds

A nerd can be defined independently of any LLMs, and then bound to different LLMs for execution. We first create a nerd by instantiating the `Nerd` class, and then we `bind` that nerd to one or more LLMs for execution. For examples, take a look at how the prebuilt nerds are defined in [./src/prebuilt](./src/prebuilt/). Note that I first create a typed nerd definition (like [revision](./src/prebuilt/revision/index.ts) or [findings](./src/prebuilt/findings/index.ts)), and then I use that to implement different nerds that define specific behaviors bound to those structures.

#### Output Parsers - How We Get Typed Output

But, unless you want to reuse the existing `findings` or `proposed_revisions` output schemas, you'll want to create your own custom OutputParser. Take a look at the [existing json output parsers](./src/internals/parsers/json) that the revision and findings nerds import. You can use these as a template to create your own flows, and then you can define nerds that give type-safe output based on your definitions.

Basically you define an output schema type that extends `NerdOutput`, and then you write a plaintext schema definition that reflects your desired structure as a string that gets passed into the prompt, with commentary to tell the LLM how to structure the response. Easier just to copy the examples. By extending `NerdOutput` you are automatically adding a `thought_log` top-level field, and should make sure to include it when you document your schema.

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
    'First, I will read through the entire text to understand its content and context.',
    'Next, I will identify any complex sentences or technical jargon that can be simplified without losing meaning.',
    'I will also look for any awkward wording that can be improved for better readability.',
    'I will ensure that the technical terms are preserved to maintain the accuracy of the content.'
  ],
  proposed_edits: [
    {
      line_number: 2,
      existing_text: 'An interesting property of as const is that it can be used to infer strings as their literal types in objects.',
      proposed_replacement: 'A useful feature of `as const` is that it can make strings keep their exact values in objects.',
      reasoning: 'Simplified the sentence to make it more readable while preserving the technical meaning.',
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 6,
      existing_text: "There's another interesting feature of `as const`, which we'll see in this example.",
      proposed_replacement: "Here's another useful feature of `as const`, shown in this example.",
      reasoning: 'Simplified the sentence for better readability.',
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 8,
      existing_text: 'The `modifyButton` function accepts an `attributes` object typed as `ButtonAttributes`, which has `type` values of "button," "submit," or "reset".',
      proposed_replacement: 'The `modifyButton` function takes an `attributes` object with a `type` that can be "button," "submit," or "reset".',
      reasoning: 'Simplified the sentence structure for better readability.',
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 19,
      existing_text: 'In this example, the `buttonAttributes` object only defines `type` as "button," which causes an error when passing it into the `modifyButton` function:',
      proposed_replacement: 'In this example, the `buttonAttributes` object only has `type` set to "button," which causes an error when passed to the `modifyButton` function:',
      reasoning: 'Simplified the sentence for better readability.',
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 29,
      existing_text: "As we've seen, we can fix this by adding `as const` to the `buttonAttributes` object, which makes the entire object read-only:",
      proposed_replacement: 'We can fix this by adding `as const` to the `buttonAttributes` object, making the whole object read-only:',
      reasoning: 'Simplified the sentence for better readability.',
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 42,
      existing_text: 'We can also apply `as const` to just `type` property:',
      proposed_replacement: 'We can also apply `as const` to just the `type` property:',
      reasoning: "Added 'the' for grammatical correctness.",
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 50,
      existing_text: "However, this time the `type` property here is not read-only, but it's inferred as its literal type:",
      proposed_replacement: 'This time, the `type` property is not read-only but is inferred as its exact value:',
      reasoning: 'Simplified the sentence for better readability.',
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 59,
      existing_text: 'Building on this, we could also ensure the literal type inference for various properties in an array of objects by adding `as const` after each `type` property:',
      proposed_replacement: 'We can also make sure the exact values are kept for properties in an array of objects by adding `as const` after each `type` property:',
      reasoning: 'Simplified the sentence for better readability.',
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 74,
      existing_text: "Even with `as const` applied, we're still able to modify the `type` property but only to be one of the allowed literal types:",
      proposed_replacement: 'Even with `as const`, we can still change the `type` property, but only to one of the allowed values:',
      reasoning: 'Simplified the sentence for better readability.',
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 80,
      existing_text: "This property makes `as const` a handy tool to be used whenever you want to ensure a specific literal is inferred for an object you're working with.",
      proposed_replacement: 'This feature makes `as const` a useful tool when you want to make sure an object keeps specific values.',
      reasoning: 'Simplified the sentence for better readability.',
      'multiple_matches?': false,
      confidence: 0.9
    }
  ]
}
```

#### Sample Output - claude-3-opus-20240229

```typescript
{
  thought_log: [
    'The original text is technical in nature, discussing a specific feature of TypeScript. I should be careful not to change the meaning or accuracy of the content while trying to make it more accessible.',
    "There are a few technical terms and code examples that I should preserve, like 'as const', 'ButtonAttributes', and the code snippets. Changing these would make the text less precise.",
    'I can break up some of the longer sentences and paragraphs to improve readability. For example, the first paragraph under the code snippet on line 19 could be split into two sentences.',
    "Some of the wording, like 'red squiggly line' on line 26, could be replaced with clearer phrasing.",
    "I'll make small adjustments to improve clarity and readability while keeping the overall structure and technical details intact, as this seems to be an article aimed at developers familiar with TypeScript."
  ],
  proposed_edits: [
    {
      line_number: 3,
      existing_text: 'description: An interesting property of as const is that it can be used to infer strings as their literal types in objects.',
      proposed_replacement: "description: The 'as const' feature in TypeScript has an interesting property - it can infer strings as their literal types in objects.",
      reasoning: "Breaking the sentence into two parts and adding 'in TypeScript' provides context and improves readability without changing the meaning.",
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 19,
      existing_text: 'In this example, the `buttonAttributes` object only defines `type` as "button", which causes an error when passing it into the `modifyButton` function:',
      proposed_replacement: 'In this example, the `buttonAttributes` object only defines `type` as "button". This causes an error when passing it into the `modifyButton` function:',
      reasoning: 'Splitting the long sentence into two shorter ones improves readability.',
      'multiple_matches?': false,
      confidence: 0.95
    },
    {
      line_number: 26,
      existing_text: 'modifyButton(buttonAttributes); // red squiggly line under buttonAttributes',
      proposed_replacement: 'modifyButton(buttonAttributes); // TypeScript shows an error under buttonAttributes',
      reasoning: "'Red squiggly line' is unclear wording. Rephrasing it as 'TypeScript shows an error' is more descriptive.",
      'multiple_matches?': false,
      confidence: 0.85
    },
    {
      line_number: 59,
      existing_text: 'Building on this, we could also ensure the literal type inference for various properties in an array of objects by adding `as const` after each `type` property:',
      proposed_replacement: 'We can extend this concept further. By adding `as const` after each `type` property, we can ensure literal type inference for properties in an array of objects:',
      reasoning: 'The proposed wording is slightly clearer and more concise, but the original is also acceptable. This is a minor change.',
      'multiple_matches?': false,
      confidence: 0.7
    }
  ]
}
```

#### Sample Output - gemini-1.5-pro-latest

```typescript
{
  thought_log: [
    'I should start by reading through the entire text to get a sense of the content.',
    "The text is about the 'as const' feature in TypeScript and how it can be used to infer strings as their literal types in objects.",
    'The text seems to be well-written and clear, but there might be some areas where I can make it more accessible.',
    'I should pay attention to complex sentences and technical jargon that might be difficult for beginners to understand.',
    'I should also look for opportunities to simplify the language without losing the technical accuracy.',
    "I see that the text uses the term 'infer'. This might be confusing for some readers. I should consider replacing it with a simpler term like 'figure out'.",
    "The phrase 'literal type inference' might also be confusing. I can try to rephrase it in a simpler way.",
    'I should also check if there are any sentences that are too long or convoluted.',
    "I see a sentence that starts with 'Building on this...' - this could be rephrased to be more direct.",
    'I should also make sure that the code examples are easy to understand and follow.',
    'I can add some explanations to the code comments to make them clearer.',
    "Finally, I should review all my proposed edits to make sure they don't change the meaning or accuracy of the original text."
  ],
  proposed_edits: [
    {
      line_number: 3,
      existing_text: 'An interesting property of as const is that it can be used to infer strings as their literal types in objects.',
      proposed_replacement: 'One cool thing about `as const` is that it can help figure out the exact values of strings in objects.',
      reasoning: "Simplified the language to make it more accessible. Replaced 'infer' with 'figure out' and rephrased 'literal types' to be more understandable.",
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 50,
      existing_text: "However, this time the `type` property here is not read-only, but it's inferred as its literal type:",
      proposed_replacement: 'However, this time the `type` property can still be changed, but TypeScript knows its exact value:',
      reasoning: "Simplified the language and replaced 'inferred as its literal type' with 'TypeScript knows its exact value' for better clarity.",
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 59,
      existing_text: 'Building on this, we could also ensure the literal type inference for various properties in an array of objects by adding `as const` after each `type` property:',
      proposed_replacement: 'We can also use this to make sure TypeScript knows the exact values of properties in an array of objects. To do this, we add `as const` after each `type` property:',
      reasoning: "Rephrased the sentence to be more direct and replaced 'literal type inference' with 'make sure TypeScript knows the exact values' for better clarity.",
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 80,
      existing_text: "This property makes `as const` a handy tool to be used whenever you want to ensure a specific literal is inferred for an object you're working with.",
      proposed_replacement: 'This makes `as const` a useful tool whenever you want TypeScript to know the exact value of a property in an object.',
      reasoning: "Simplified the language and replaced 'ensure a specific literal is inferred' with 'TypeScript to know the exact value' for better clarity.",
      'multiple_matches?': false,
      confidence: 0.9
    }
  ]
}
```

### Prebuilt Revision Nerd: CodeSnippetTunerNerd

This one is a bit tricky because we're running it against source texts that sometimes include intentionally incorrect code snippets. I've attempted to account for that. The goal here is to improve any code snippets found in a source text, where "improve" is defined fairly broadly. The [definition](./src/prebuilt/revision/code_snippet_tuner_nerd.ts) is here and we can continue to tweak it. The output you'll receive looks like this:

#### Sample Output - gpt-4o

```typescript
{
  thought_log: [
    'First, I will review the code snippets to ensure they are correct and idiomatic.',
    'I will check for consistency in variable names and ensure the code demonstrates what the text describes.',
    'I will add comments to any code snippets that might lack clarity.',
    'I will ensure that the code snippets are correct and idiomatic without changing their fundamental behavior.'
  ],
  proposed_edits: [
    {
      line_number: 23,
      existing_text: 'type: "button";',
      proposed_replacement: 'type: "button",',
      reasoning: 'In JavaScript/TypeScript object literals, properties should be separated by commas, not semicolons. This is a syntax error.',
      'multiple_matches?': false,
      confidence: 1
    },
    {
      line_number: 33,
      existing_text: 'type: "button";',
      proposed_replacement: 'type: "button",',
      reasoning: 'In JavaScript/TypeScript object literals, properties should be separated by commas, not semicolons. This is a syntax error.',
      'multiple_matches?': false,
      confidence: 1
    },
    {
      line_number: 77,
      existing_text: 'buttonAttributes.type = "button";',
      proposed_replacement: 'buttonAttributes.type = "submit";',
      reasoning: "The example should demonstrate changing the type to another allowed literal type ('submit' or 'reset') to show that the property can be modified within the allowed types.",
      'multiple_matches?': false,
      confidence: 1
    }
  ]
}
```

#### Sample Output - claude-3-opus-20240229

```typescript
{
  thought_log: [
    'The code snippets look mostly correct and idiomatic. The variable names are consistent and meaningful.',
    'The snippets demonstrate the concepts being discussed in the text.',
    "The only potential issue I see is in the last snippet, where it's modifying the `buttonAttributes` object which was not defined in this code block. This could be confusing.",
    'To improve clarity, I think it would be helpful to add a comment explaining where `buttonAttributes` comes from.',
    'With that small addition, I believe these code snippets effectively illustrate the points being made in the text.'
  ],
  proposed_edits: [
    {
      line_number: 77,
      existing_text: 'buttonAttributes.type = "button";',
      proposed_replacement: '// Assuming buttonAttributes is defined as in the earlier example:\n' +
        'buttonAttributes.type = "button";',
      reasoning: "Adding a comment to clarify where buttonAttributes comes from, as it's not defined in this code block.",
      'multiple_matches?': false,
      confidence: 0.9
    }
  ]
}
```

#### Sample Output - gemini-1.5-pro-latest

```typescript
[error parsing output]
```

### Prebuilt Revision Nerd: PersonalityNerd

This one is more playful, but potentially useful if you want to tweak the tone of a given text. Basically you invoke it by passing in a personality defined in some way. The nerd proposes edits to make it feel as if the document was written by someone with the given personality. It makes use of the second optional input argumennt, "runtime_instructions", to allow you to specify the personality at runtime. If you forget you'll get Deadpool and he'll use fourth-wall violations to remind you to parameterize the nerd. The [definition is here](./src/prebuilt/revision/personality_nerd.ts) and the output looks like this - the personality I specified was "a klingon warrior who is getting flustered as he attempts to write technical documentation accessible to human engineers":

#### Sample Output - gpt-4o

```typescript
{
  thought_log: [
    "First, I need to identify areas where the Klingon warrior's flustered personality can be injected into the text.",
    'The document is technical, so the edits should maintain clarity while adding a sense of frustration or intensity.',
    "I'll start by looking for places where the text can be made more expressive or where the Klingon might show frustration with the complexity of human technology."
  ],
  proposed_edits: [
    {
      line_number: 6,
      existing_text: "There's another interesting feature of `as const`, which we'll see in this example.",
      proposed_replacement: 'Behold, another feature of `as const` that even a Klingon warrior must acknowledge, as we shall see in this example.',
      reasoning: 'Adding a sense of reluctant admiration and intensity to the introduction of the feature.',
      confidence: 1
    },
    {
      line_number: 19,
      existing_text: 'In this example, the `buttonAttributes` object only defines `type` as "button," which causes an error when passing it into the `modifyButton` function:',
      proposed_replacement: 'In this cursed example, the `buttonAttributes` object only defines `type` as "button," causing an infuriating error when passing it into the `modifyButton` function:',
      reasoning: "Expressing frustration with the error to reflect the Klingon warrior's personality.",
      confidence: 1
    },
    {
      line_number: 29,
      existing_text: "As we've seen, we can fix this by adding `as const` to the `buttonAttributes` object, which makes the entire object read-only:",
      proposed_replacement: 'As we have painfully discovered, we can fix this by adding `as const` to the `buttonAttributes` object, making the entire object read-only:',
      reasoning: 'Adding a sense of struggle and discovery to the solution.',
      confidence: 1
    },
    {
      line_number: 42,
      existing_text: 'We can also apply `as const` to just `type` property:',
      proposed_replacement: 'We can also apply `as const` to just the `type` property, if you wish to avoid further dishonor:',
      reasoning: 'Adding a touch of Klingon honor culture to the explanation.',
      confidence: 1
    },
    {
      line_number: 50,
      existing_text: "However, this time the `type` property here is not read-only, but it's inferred as its literal type:",
      proposed_replacement: 'However, this time the `type` property is not read-only, but it is inferred as its literal type, a small victory in this battle:',
      reasoning: 'Adding a sense of triumph to the explanation.',
      confidence: 1
    },
    {
      line_number: 74,
      existing_text: "Even with `as const` applied, we're still able to modify the `type` property but only to be one of the allowed literal types:",
      proposed_replacement: 'Even with `as const` applied, we are still able to modify the `type` property, but only to one of the allowed literal types, as if the universe mocks us:',
      reasoning: 'Adding a sense of frustration and struggle with the limitations.',
      confidence: 1
    },
    {
      line_number: 80,
      existing_text: "This property makes `as const` a handy tool to be used whenever you want to ensure a specific literal is inferred for an object you're working with.",
      proposed_replacement: 'This property makes `as const` a formidable tool, to be wielded whenever you wish to ensure a specific literal is inferred for an object you are battling with.',
      reasoning: 'Adding a sense of combat and intensity to the conclusion.',
      confidence: 1
    }
  ]
}
```

#### Sample Output - claude-3-opus-20240229

```typescript
{
  thought_log: [
    'As a Klingon warrior attempting to write technical documentation, I should focus on making the language more direct and forceful.',
    'I should remove any overly flowery or ambiguous language and get straight to the point.',
    'At the same time, I need to be careful not to change the technical meaning or accuracy of the content.',
    'I should express some frustration at having to dumb things down for human readers.',
    'My edits should be relatively minor to maintain the instructional nature of the document, with just a bit of Klingon flair added.'
  ],
  proposed_edits: [
    {
      line_number: 3,
      existing_text: 'description: An interesting property of as const is that it can be used to infer strings as their literal types in objects.',
      proposed_replacement: 'description: The as const construct allows you to infer string literals as their own types within objects. This is its purpose.',
      reasoning: 'Made the description more direct and forceful. Removed wishy-washy language.',
      'multiple_matches?': false,
      confidence: 0.8
    },
    {
      line_number: 6,
      existing_text: "There's another interesting feature of `as const`, which we'll see in this example.",
      proposed_replacement: 'Now witness the power of `as const` in the following example, human.',
      reasoning: 'Added some condescending Klingon attitude toward the human reader.',
      'multiple_matches?': false,
      confidence: 0.7
    },
    {
      line_number: 29,
      existing_text: "As we've seen, we can fix this by adding `as const` to the `buttonAttributes` object, which makes the entire object read-only:",
      proposed_replacement: 'To resolve this, add `as const` to the `buttonAttributes` object. This will make the pathetic object read-only:',
      reasoning: 'Expressed frustration at the shortcomings of the buttonAttributes object.',
      'multiple_matches?': false,
      confidence: 0.75
    },
    {
      line_number: 80,
      existing_text: "This property makes `as const` a handy tool to be used whenever you want to ensure a specific literal is inferred for an object you're working with.",
      proposed_replacement: 'This demonstrates the power of `as const` for ensuring literal types, a technique you would be wise to employ.',
      reasoning: 'Made the final statement more commanding and direct.',
      'multiple_matches?': false,
      confidence: 0.85
    }
  ]
}
```

#### Sample Output - gemini-1.5-pro-latest

```typescript
{
  thought_log: [
    "The user wants me to rewrite this as a Klingon warrior who's struggling to write human-readable technical documentation.",
    'I should make sure to pepper in some Klingon phrases and exclamations.',
    "I'll also try to make the Klingon sound frustrated with the limitations of human language.",
    "I need to make sure the edits are subtle and don't change the meaning of the text.",
    "I'll focus on the highest-impact edits that will make the document sound more Klingon."
  ],
  proposed_edits: [
    {
      line_number: 6,
      existing_text: "There's another interesting feature of `as const`, which we'll see in this example.",
      proposed_replacement: 'Behold! Another intriguing aspect of `as const`, which this example shall demonstrate.',
      reasoning: 'This adds a bit of Klingon flair to the introduction.',
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 19,
      existing_text: 'In this example, the `buttonAttributes` object only defines `type` as "button," which causes an error when passing it into the `modifyButton` function:',
      proposed_replacement: 'Observe, human! In this instance, the `buttonAttributes` object defines `type` solely as "button," resulting in an error when passed to the `modifyButton` function. Qapla\'!',
      reasoning: 'This adds a Klingon exclamation and makes the language more forceful.',
      'multiple_matches?': false,
      confidence: 0.8
    },
    {
      line_number: 80,
      existing_text: "This property makes `as const` a handy tool to be used whenever you want to ensure a specific literal is inferred for an object you're working with.",
      proposed_replacement: "This property renders `as const` a valuable weapon in your arsenal, human, to be wielded whenever you desire a specific literal to be inferred for an object under your command. Heghlu'meH QaQ jajvam!",
      reasoning: 'This replaces "handy tool" with a more Klingon-appropriate "weapon" and adds a Klingon proverb for emphasis.',
      'multiple_matches?': false,
      confidence: 0.7
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
    'First, I will read through the entire document to understand its content and context.',
    'Next, I will identify any typos, missing words, or punctuation errors.',
    'I will also ensure consistency in the use of acronyms and domain-specific vocabulary.',
    'I will start from the top and work my way down, line by line.'
  ],
  proposed_edits: [
    {
      line_number: 23,
      existing_text: 'type: "button";',
      proposed_replacement: 'type: "button",',
      reasoning: 'In JavaScript object notation, properties should be separated by commas, not semicolons.',
      'multiple_matches?': false,
      confidence: 1
    },
    {
      line_number: 33,
      existing_text: 'type: "button";',
      proposed_replacement: 'type: "button",',
      reasoning: 'In JavaScript object notation, properties should be separated by commas, not semicolons.',
      'multiple_matches?': false,
      confidence: 1
    },
    {
      line_number: 77,
      existing_text: 'buttonAttributes.type = "button";',
      proposed_replacement: 'buttonAttributes.type = "submit";',
      reasoning: 'The example should show changing the type to a different allowed literal type to demonstrate the flexibility of `as const`.',
      'multiple_matches?': false,
      confidence: 0.9
    }
  ]
}
```

#### Sample Output - claude-3-opus-20240229

```typescript
{
  thought_log: [
    "The text appears to be a technical article about the 'as const' feature in TypeScript. I will scan it carefully for any typos or mechanical errors.",
    'Line 23 is missing a semicolon at the end. This should be fixed.',
    "On line 42, there seems to be an extraneous 'also' that could be removed for clarity.",
    "Line 46 is missing a semicolon after the 'as const' annotation.",
    "Everything else looks good mechanically. The article seems to be written clearly with relevant code examples. I don't see any other obvious typos or errors to fix."
  ],
  proposed_edits: [
    {
      line_number: 23,
      existing_text: 'type: "button"',
      proposed_replacement: 'type: "button";',
      reasoning: 'Adding missing semicolon at end of property declaration.',
      'multiple_matches?': false,
      confidence: 1
    },
    {
      line_number: 42,
      existing_text: 'We can also apply `as const` to just `type` property:',
      proposed_replacement: 'We can apply `as const` to just the `type` property:',
      reasoning: "Removing extraneous 'also' for conciseness.",
      'multiple_matches?': false,
      confidence: 0.8
    },
    {
      line_number: 46,
      existing_text: 'type: "button" as const',
      proposed_replacement: 'type: "button" as const;',
      reasoning: "Adding missing semicolon after 'as const' annotation.",
      'multiple_matches?': false,
      confidence: 1
    }
  ]
}
```

#### Sample Output - gemini-1.5-pro-latest

```typescript
{
  thought_log: [
    'I should start by scanning the entire document for any misspellings.',
    "Next, I'll check for any missing words or grammatical errors.",
    "I'll pay close attention to the code snippets to ensure the syntax is correct and consistent.",
    "Finally, I'll review the entire document for any remaining errors and ensure everything flows smoothly.",
    'I did not find any errors in the document. Returning an empty array for proposed_edits.'
  ],
  proposed_edits: []
}
```

### Prebuilt Findings Nerd: WikipediaResearchNerd

This is more of a demo of using tools than a functionally useful nerd itself. This nerd is instructed to have ADHD and go down a wikipedia rabbit hole researching a given prompt, so the result can be a bit random. I used "the minions" as my initial prompt. Unlike the revisions nerds above, a Findings nerd just returns a list of findings. The source is [here](./src/prebuilt/findings/wikipedia_research_nerd.ts) and the output looks like this:

#### Sample Output - gpt-4o

```typescript
{
  thought_log: [
    "I started by searching for 'Minions' on Wikipedia to get an overview of the topic.",
    "The initial search provided information about the 2015 film 'Minions' and its plot.",
    "To gather more comprehensive information, I decided to search for related topics such as 'Despicable Me', 'Illumination Entertainment', 'Villain-Con', and 'Minions: The Rise of Gru'.",
    'I executed parallel searches for these topics to maximize efficiency.',
    "The searches returned detailed information about the 'Despicable Me' franchise, Illumination Entertainment, and the sequel 'Minions: The Rise of Gru'."
  ],
  findings: [
    "Minions are small, yellow, pill-shaped creatures that have existed since the beginning of time, evolving from single-celled organisms to beings that exist only to serve history's most evil masters. [https://en.wikipedia.org/wiki/Minions_(film)]",
    "The 2015 film 'Minions' is a prequel to 'Despicable Me' and follows the Minions as they search for a new evil master after accidentally killing all their previous ones. [https://en.wikipedia.org/wiki/Minions_(film)]",
    "The 'Despicable Me' franchise includes three main films and two spin-off prequels, making it the highest-grossing animated film franchise of all time. [https://en.wikipedia.org/wiki/Despicable_Me]",
    "Illumination Entertainment, founded in 2007, is the animation studio behind the 'Despicable Me' and 'Minions' films. The studio is known for its cost-effective production model and high-grossing films. [https://en.wikipedia.org/wiki/Illumination_(company)]",
    "Villain-Con is a fictional convention for villains featured in the 'Minions' film, where the Minions meet Scarlet Overkill, the world's first female supervillain. [https://en.wikipedia.org/wiki/Minions_(film)]",
    "The sequel 'Minions: The Rise of Gru' (2022) follows an eleven-year-old Gru as he plans to become a supervillain with the help of his Minions, leading to a showdown with the Vicious 6. [https://en.wikipedia.org/wiki/Minions:_The_Rise_of_Gru]"
  ]
}
```

#### Sample Output - claude-3-opus-20240229

```typescript
{
  thought_log: [
    "The task is to search Wikipedia to find any information related to the topic of 'the minions'. I will use the wikipedia-api tool to perform some searches.",
    'The initial search results provide a good overview of what minions are and some of their key characteristics, including their appearance, behavior, abilities, and language. This gives a solid foundation to understand them as characters.',
    'To improve the coverage, it would be good to also explore the role minions play in the Despicable Me movies, more of their backstory from the Minions films, info on individual main minions, and their cultural impact and popularity. I will do some additional searches.',
    'The additional results provide important context on how the minions fit into the larger Despicable Me franchise, including their relationship to Gru, their role in the main plot, and additional details from the spinoff Minions films and short films. I feel I now have a fairly comprehensive understanding to provide a good summary of the key points about minions.'
  ],
  findings: [
    'Minions are small yellow creatures that appear in the Despicable Me franchise. They are characterized by childlike behavior and speaking a unique language. Physically they are short with one or two eyes, wear blue overalls and goggles.',
    'Minions are biologically wired to seek out and serve villains, becoming depressed without an evil master. They have existed since the beginning of life on Earth, serving many villains throughout history, as shown in the Minions spinoff films.',
    'In the Despicable Me films, minions are the henchmen of Gru, a supervillain turned secret agent. They help with his plots, take care of his adopted daughters, and provide comic relief through their silly antics. Main minion characters include Kevin, Stuart, and Bob.',
    'The Minions speak a fictional language called Minionese, which includes words from many languages. They have an almost uncontrollable love for bananas and fruit.',
    'Minions have become extremely popular, with the Despicable Me franchise being the highest grossing animated film franchise of all time. The minions have become iconic characters featured in many short films as well as merchandising, memes and marketing as the mascots of Illumination Entertainment.'
  ]
}
```

#### Sample Output - gemini-1.5-pro-latest

```typescript
{
  thought_log: [
    'Okay, so I need to find information on "the minions" from Wikipedia. I should start with a simple Wikipedia search for that term.',
    `I'm using the wikipedia-api to search for "the minions".`,
    "Wow, the first result is about the Despicable Me franchise! That makes sense. I'll add that to my findings.",
    'The article mentions Illumination Entertainment, the company that produced the films. I should check out their Wikipedia page too!',
    `I'm using the wikipedia-api to search for "Illumination Entertainment".`,
    "Interesting! Illumination also made movies like Sing and The Secret Life of Pets. I'll add a finding about that.",
    'The Illumination page mentions Chris Meledandri, the founder and CEO. He seems important, I should see what his Wikipedia page says.',
    `I'm using the wikipedia-api to search for "Chris Meledandri".`,
    "Whoa, Meledandri used to work at 20th Century Fox Animation and Blue Sky Studios. That's cool! I'll add a finding about that.",
    "This is getting pretty interesting, but I think I have enough information for now. I'll return my findings."
  ],
  findings: [
    'The Minions are small, yellow creatures who are known for their comical appearance and behavior. They are a major part of the Despicable Me franchise. (https://en.wikipedia.org/wiki/Despicable_Me)',
    'Illumination Entertainment, the company behind the Despicable Me franchise, has also produced popular animated films like Sing and The Secret Life of Pets. (https://en.wikipedia.org/wiki/Illumination_Entertainment)',
    'Chris Meledandri, the founder and CEO of Illumination Entertainment, previously held positions at 20th Century Fox Animation and Blue Sky Studios. (https://en.wikipedia.org/wiki/Chris_Meledandri)'
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
    'First, I need to extract relevant concepts from the given text.',
    'Next, I will use the existingConceptFinder tool to check if any of the extracted concepts already exist in the store.',
    'Based on the results, I will decide whether to use the existing concepts or add new ones.',
    'Finally, I will add any new concepts to the store and return the final list of concepts.',
    "I have extracted the following concepts: 'as const', 'literal types', 'ButtonAttributes', 'modifyButton function', 'type property', 'read-only', 'literal type inference'.",
    'I used the existingConceptFinder tool to check for existing concepts in the store.',
    'No existing concepts were found, so I added all the extracted concepts to the store.'
  ],
  findings: [
    'as const',
    'literal types',
    'ButtonAttributes',
    'modifyButton function',
    'type property',
    'read-only',
    'literal type inference'
  ]
}
```

#### Sample Output - claude-3-opus-20240229

```typescript
{
  thought_log: [
    'Extracted relevant TypeScript concepts from the technical document',
    'Used existingConceptFinder tool to check for any existing similar concepts in the store - no matches found',
    'Since all concepts are new, used addConceptsToStore tool to add the 6 extracted concepts to the concept store'
  ],
  findings: [
    'as const',
    'literal types',
    'object literal',
    'readonly',
    'ButtonAttributes',
    'infer strings as literal types'
  ]
}
```

#### Sample Output - gemini-1.5-pro-latest

```typescript
{
  thought_log: [
    'I need to extract concepts from the text provided.',
    "The text focuses on the use of 'as const' in TypeScript to infer literal types for strings in objects.",
    "Based on the text, I've identified the following concepts: 'as const', 'literal types', 'string literal types', 'objects', 'read-only', 'TypeScript', 'type inference'.",
    "I should use the 'existingConceptFinder' tool to see if any of these concepts already exist in the store.",
    "I've used the 'existingConceptFinder' tool. It returned the following matches: 'as const', 'literal types', 'TypeScript'.",
    'I will replace the extracted concepts with the matching concepts from the store.',
    "The remaining concepts are: 'string literal types', 'objects', 'read-only', 'type inference'. I need to add these to the store using the 'addConceptsToStore' tool.",
    "I've added the new concepts to the store using the 'addConceptsToStore' tool. All concepts are now accounted for.",
    "My final list of concepts is: 'as const', 'literal types', 'string literal types', 'objects', 'read-only', 'TypeScript', 'type inference'."
  ],
  findings: [
    'as const',
    'literal types',
    'string literal types',
    'objects',
    'read-only',
    'TypeScript',
    'type inference'
  ]
}
```
