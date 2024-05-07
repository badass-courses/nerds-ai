# nerds-ai
This repo contains a suite of "nerds", which are abstractions around various LLM flows. A nerd is specific, easily defined, and composable as a tool so it can be passed either to other nerds or to general tool-calling agents. The goal is to make it easy to build and test new LLM flows by providing a set of building blocks that can be easily combined and tested.

This repo contains a variety of [prebuilt nerds](./src/prebuilt) that can be used directly, or which can be used as examples for building new nerds.

## Setup
You should define your environment variables to contain the following as specified in `.env.template`. The current implementation simply expects all of this stuff to be in your .env, and may through errors if you try to perform a flow that requires one of these variables without having it defined:
```bash
GOOGLE_API_KEY="REPLACE_ME"
ANTHROPIC_API_KEY="REPLACE_ME"
OPENAI_API_KEY="REPLACE_ME"

PINECONE_API_KEY="REPLACE_ME"
PINECONE_ENVIRONMENT="REPLACE_ME"
PINECONE_INDEX_NAME="REPLACE_ME"
```

## Creating Nerds
A nerd can be defined independently of any LLMs, and then bound to different LLMs for execution. We first create a nerd by implementing the `BaseNerd` type, and then we `bind` that nerd to one or more LLMs for execution.

### Nerd Config
A nerd config object defines what the nerd dooes and how. This is mostly used to implement the system message, and contains a few parameterizable things:

```typescript
export type BaseNerd<T extends NerdOutput> = {
  // the name of the nerd
  name: string

  // a concise and direct summary of the nerd's purpose
  purpose: string

  // a set of things that the nerd should actively seek to do as it runs
  do_list: string[]

  // a set of things that the nerd should avoid doing as it runs
  do_not_list: string[]

  // when the nerd is wrapped as a tool, how is that tool described?
  as_tool_description: string

  // this is a wildcard field to include additional instructions to the nerd that are not covered by the above fields
  additional_notes?: string

  // Nerds have the option to use Tools to help them accomplish their goals. This is a list of tools that the nerd can use.
  tools?: StructuredToolInterface[],

  // The output parser is primarily used to convert the string output of the LLM into a structured object of a given type.
  parser: NerdOutputParser<T>,

  // This abstraction needs to be cleaned up a bit, but right now this tells the nerd whether it's just a simple chat model (SIMPLE_AGENT) or a tool-calling agent (TOOL_CALLING_AGENT), and there are various ramifications for internal flows based on this.
  agent_specifier: AgentSpecifier
}
```

### One Nerd To Bring Them All and In The Darkness Bind Them
Once you have a BaseNerd you can bind it to an LLM. Currently out of the box this library supports OpenAI, Anthropic and Google LLMs. The `NerdPlatformBinder` class exposes a `.bindToPlatform(platform, platform_opts?)` method which returns the invocable nerd object that's ready to use. It returns an object that looks like this:

```typescript
type BoundNerd<T extends NerdOutput> = {
  // this is a reference to the underlying BaseNerd object
  nerd: BaseNerd<T>,

  // this method will return a structured object of the type specified in the BaseNerd object
  invoke: (input: string, runtime_instructions:string ) => Promise<T>,

  // this method will return a raw string output from the LLM. When using a nerd as a tool it's necessary to pass a string back into the invoking flow,
  // so this method gives us a way to do that.
  invoke_raw: (input: string, runtime_instructions) => Promise<string>,
  
  // this is a wrapped version of the nerd - it implements the `invoke_raw` method and specifies the tool description and input schema.
  tool: StructuredToolInterface
}
```

### Nerd Output
Fundamentally there are two kinds of nerds - those that return structured JSON objects and those that return markdown strings. In either case, a nerd's output will generally specify a "chain of thought" as well as its actual final output. There are various kinds of JSON Nerd Outputs out there - the prebuilt nerds have a simple `Findings` output type which simply returns an array of strings, and a more complex `ProposedRevisions` output type which returns some structured data whose purpose is to allow a user to build an interface where they can accept or reject proposed revisions to a text.

## Example Nerd Outputs
I've got a bunch of scripts to run against proprietary texts that are .gitignored from this repo. We can set those up, but here's a very simple set of outputs -- these come from invoking `npm run demo:test`, which is a passthrough to [test_flow.mjs](./scripts/test_flow.mjs). This script is a simple test script that runs a few nerds against a few inputs and logs the outputs.

The two demos included here are:
  1. ConceptNerd - this nerd extracts concepts from a text and checks them against a store of existing concepts. This is actually reading from and writing to a Pinecone vector database. We can tune the way it selects and defines the concepts it extracts.
  2. PersonalityNerd - this nerd infuses a text with the personality of a Klingon warrior. It does this by making a series of proposed edits to the text, which are designed to make the text more forceful and direct. This is a simple example of a nerd that makes a series of proposed edits to a text.

If you have a folder of source texts you can also run the other scripts in the `scripts` folder, which are designed to read files from a source directory and then write those files with nerd outputs appended to the bottom to a target directory. I'm not including them here for reasons of proprietary data, but happy to show you how to get this up and running.

```
RAW string output from concept nerd:
{
  "chain_of_thought": [
    "First, I need to extract relevant concepts from the provided text. The text discusses TypeScript features, specifically focusing on 'as const' and its use in type inference and object immutability.",
    "Identified concepts include: 'as const', 'literal type inference', 'ButtonAttributes', 'modifyButton function', 'read-only properties', 'type property', 'modifyButtons function', 'buttonsToChange array'.",
    "Next, I will use the existingConceptFinder tool to check if any of these concepts already exist in the store or if there are similar concepts that could be used instead.",
    "After receiving the results from the existingConceptFinder, I will decide whether to replace any of the extracted concepts with existing ones or add new concepts to the store.",
    "Finally, I will add any new concepts that are not already in the store using the addConceptsToStore tool and return the final list of concepts."
  ],
  "findings": [
    "as const",
    "literal type inference",
    "ButtonAttributes",
    "modifyButton function",
    "read-only properties",
    "type property",
    "modifyButtons function",
    "buttonsToChange array"
  ]
}
---
Parsed JSON output from concept nerd:
{
  chain_of_thought: [
    "First, I need to extract relevant concepts from the provided text. The text discusses TypeScript features, specifically focusing on 'as const' and its use in type inference for object properties.",
    "Identified concepts include: 'as const', 'literal type inference', 'ButtonAttributes', 'modifyButton function', 'read-only properties', 'type property', 'modifyButtons function', 'buttonsToChange array'.",
    'Next, I will use the existingConceptFinder tool to check if any of these concepts already exist in the store or if there are similar concepts that could be used instead.',
    'After receiving the results from the existingConceptFinder, I will decide whether to replace any of the extracted concepts with existing ones or add new concepts to the store.',
    'Finally, I will add any new concepts that are not already in the store using the addConceptsToStore tool and return the final list of concepts.'
  ],
  findings: [
    'as const',
    'literal type inference',
    'ButtonAttributes',
    'modifyButton function',
    'read-only properties',
    'type property',
    'modifyButtons function',
    'buttonsToChange array'
  ]
}
------------
Testing PersonalityNerd
RAW string output from personality nerd:
{
  "chain_of_thought": [
    "First, I need to infuse the document with the personality of a Klingon warrior. Klingons are known for their directness, honor, and often use a commanding tone. They also value strength and combat readiness.",
    "The document is technical, discussing TypeScript's `as const` usage. I need to maintain the technical accuracy while adjusting the tone to be more direct and forceful, as a Klingon would prefer.",
    "I'll look for opportunities to make the language more commanding and possibly integrate metaphors related to battle or strength, which are common in Klingon expressions.",
    "I'll start by adjusting the title and description to be more direct and possibly include a metaphor related to battle or readiness.",
    "Next, I'll review the body of the text to find sentences that can be made more direct or infused with Klingon-like expressions."
  ],
  "proposed_edits": [
    {
      "line_number": 1,
      "existing_text": "Infer Strings as Their Literal Types in Objects with as const",
      "proposed_replacement": "Commanding Strings to Assume Their Literal Forms with as const",
      "reasoning": "Changing 'Infer' to 'Commanding' gives a more direct and forceful tone, aligning with a Klingon's preference for authority and control.",
      "multiple_matches?": false,
      "confidence": 0.9
    },
    {
      "line_number": 3,
      "existing_text": "An interesting property of as const is that it can be used to infer strings as their literal types in objects.",
      "proposed_replacement": "A powerful tactic of as const is that it can be wielded to ensure strings assume their literal types in objects.",
      "reasoning": "Replacing 'interesting property' with 'powerful tactic' and 'can be used to infer' with 'can be wielded to ensure' adds a sense of strength and strategy, resonating with Klingon values.",
      "multiple_matches?": false,
      "confidence": 0.9
    },
    {
      "line_number": 5,
      "existing_text": "There's another interesting feature of `as const`, which we'll see in this example.",
      "proposed_replacement": "Prepare for another formidable feature of `as const`, demonstrated in this example.",
      "reasoning": "Using 'Prepare' and 'formidable feature' adds a sense of readiness and strength, fitting for a Klingon tone.",
      "multiple_matches?": false,
      "confidence": 0.9
    },
    {
      "line_number": 9,
      "existing_text": "In this example, the `buttonAttributes` object only defines `type` as \"button,\" which causes an error when passing it into the `modifyButton` function:",
      "proposed_replacement": "In this battle scenario, the `buttonAttributes` object merely defines `type` as \"button,\" leading to a tactical error when deploying it into the `modifyButton` function:",
      "reasoning": "Referring to the example as a 'battle scenario' and using 'tactical error' and 'deploying' adds a militaristic and strategic flavor, aligning with Klingon culture.",
      "multiple_matches?": false,
      "confidence": 0.9
    }
  ]
}
---
Parsed JSON output from personality nerd:
{
  chain_of_thought: [
    'First, I need to infuse the document with the personality of a Klingon warrior. Klingons are known for their directness, honor, and a certain form of aggression in their language. The document is technical, so I need to maintain its clarity while adding a touch of Klingon flavor.',
    "I'll look for opportunities to make the language more direct and forceful, perhaps using metaphors related to battle or strength where appropriate.",
    "The title and description are straightforward, but I can make them more commanding to reflect a Klingon's assertive nature.",
    "In the body, I'll look for sentences that can be made more direct or where powerful imagery can be subtly introduced without altering the technical content.",
    "I'll also ensure that any changes I make do not alter the underlying technical meanings or instructions."
  ],
  proposed_edits: [
    {
      line_number: 2,
      existing_text: 'Infer Strings as Their Literal Types in Objects with as const',
      proposed_replacement: 'Command Strings to Reveal Their True Forms in Objects with as const',
      reasoning: "Changing 'Infer' to 'Command' gives a more forceful, direct tone, aligning with a Klingon's commanding nature.",
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 3,
      existing_text: 'An interesting property of as const is that it can be used to infer strings as their literal types in objects.',
      proposed_replacement: 'A powerful tactic of as const is that it can be wielded to command strings to assume their literal types in objects.',
      reasoning: "Replacing 'interesting property' with 'powerful tactic' and 'used to infer' with 'wielded to command' adds a sense of strength and strategy, resonating with Klingon culture.",
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 5,
      existing_text: "There's another interesting feature of `as const`, which we'll see in this example.",
      proposed_replacement: 'Prepare for another formidable feature of `as const`, demonstrated in this example.',
      reasoning: "Using 'formidable feature' and 'Prepare' adds a sense of anticipation and strength, fitting for a Klingon's tone.",
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 27,
      existing_text: "This property makes `as const` a handy tool to be used whenever you want to ensure a specific literal is inferred for an object you're working with.",
      proposed_replacement: 'This property forges `as const` into a mighty weapon, to be wielded whenever you demand a specific literal to be recognized in your strategic coding endeavors.',
      reasoning: "Referring to `as const` as a 'mighty weapon' and using 'wielded' and 'demand' enhances the aggressive and strategic tone suitable for a Klingon.",        
      'multiple_matches?': false,
      confidence: 0.9
    }
  ]
}
```