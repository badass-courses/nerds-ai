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

### BaseNerd<T>

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

### One Nerd To Bring Them All and In The Darkness Bind Them

Once you have a BaseNerd you can bind it to an LLM. If you're using the `Nerd` class (`const nerd = new Nerd(params)`), you can invoke `await nerd.bindToModel(model)` to get a `BoundNerd` which you can execute.

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

Fundamentally there are two kinds of nerds - those that return structured JSON objects and those that return markdown strings. In either case, a nerd's output will generally specify a "chain of thought" as well as its actual final output. There are various kinds of JSON Nerd Outputs out there - the prebuilt nerds have a simple `Findings` output type which simply returns an array of strings, and a more complex `ProposedRevisions` output type which returns some structured data whose purpose is to allow a user to build an interface where they can accept or reject proposed revisions to a text.

## Project Next Steps

I've got a lot of things I'd like to add to this project, here is a general list:

- [ ] Add chat memory and conversational context to the nerds so they're not just one-and-done if you don't want them to be.
- [ ] Building on the ConceptExtraction model with vector-store based canonical concepts, I want to build a graph data extractor. The idea would be to extract a graph of concepts from a given text, and then use that graph to build a structured JSON object that represents the relationships between those concepts and persist it in something like Nebula. This graph can then be used via a RAG flow to feed into other nerds.
- [ ] Create a `DynamicToolNerd` which is designed to allow users to implement tools with specific signatures at runtime. This way we could e.g. implement a ConceptStore nerd that has its own bespoke database accessors that e.g. perform I/O against a dynamically defined pinecone index and also allow writes to a separate K/V store that actually tracks concepts, etc.
- [ ] LangChain exposes an experimental AutoGPT feature. I haven't dug too deeply into this yet, but I think that I can swing this in a way that would allow me to build an "AutoNerd" that has access to the full suite of nerds as well as the capacity implement entirely new nerds as it runs. This could then become the "Digital Gardener" we've talked about, constantly running against the entire suite of content and proposing revisions constantly over time without needing to be invoked directly.
- [x] Add input pre-processors so that nerds can do things like insert line-number annotations and other things to their input prior to running them.
- [x] Make `agent_specifier` completely internal. In practice every decision it makes should be able to be automated based on e.g. whether or not the nerd is using tools, and which platform we're running against.

## Prebuilt Nerds

This is a running list of prebuilt nerds including sample outputs when run against a document from the egghead source material. The input document is not checked into the repo because those texts are proprietary, I'm happy to share them with other egghead folks if you want to run them yourselves or you can run them against your own stuff.

There are currently two different kinds of nerds - those that return a markdown string and those that return a structured JSON object. The markdown string nerds are generally used for simple tasks like summarization, while the structured JSON nerds are used for more complex tasks like proposing revisions to a text. The prebuilt nerds are currently all built to return JSON.

There are currently two JSON output types defined. Both return an object with a `thought_log` string array as well as a typed payload.

- `Findings` - A Findings nerd is really straightforward. It simply returns an array of strings that represent the findings of the nerd. This is useful to prepare concise input to other nerds, for instance.
- `Revisions` - A Revisions nerd is a bit more ambitious. Given some text input, it returns a list of proposed revisions to that text. The idea is that a user can then accept/reject those revisions via some user interface, seamlessly mutating the text.

I've got a number of different kinds of prebuilt nerds that implement these two basic types, and as you can see it's hopefully pretty straightforward to define new ones. The examples you'll find below are all defined in [./scripts/simple](./scripts/simple/) and you can run them yourself if you have the appropriate environment variables defined and can supply text input. Note that we are generating inputs only against OpenAI, but all tools except wiki and content extraction are available for Anthropic and Google as well. The tool-using nerds (wiki and context) require a tool-using LLM, and currently Gemini doesn't support that so they won't work with Gemini, but work fine with Anthropic as well as OpenAI.

### Prebuilt Revision Nerd: AccessibleLanguageNerd

This nerd takes a text input and returns a list of proposed revisions to make the text more accessible. This is a good example of a nerd that returns a `Revisions` object. The [definition](./src/prebuilt/revision/accessible_language_nerd.ts) is straightforward and easily tunable. The output you'll receive looks like this:

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

### Prebuilt Revision Nerd: CodeSnippetTunerNerd

This one is a bit tricky because we're running it against source texts that sometimes include intentionally incorrect code snippets. I've attempted to account for that. The goal here is to improve any code snippets found in a source text, where "improve" is defined fairly broadly. The [definition](./src/prebuilt/revision/code_snippet_tuner_nerd.ts) is here and we can continue to tweak it. The output you'll receive looks like this:

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

### Prebuilt Revision Nerd: PersonalityNerd

This one is more playful, but potentially useful if you want to tweak the tone of a given text. Basically you invoke it by passing in a personality defined in some way. The nerd proposes edits to make it feel as if the document was written by someone with the given personality. It makes use of the second optional input argumennt, "runtime_instructions", to allow you to specify the personality at runtime. If you forget you'll get Deadpool and he'll use fourth-wall violations to remind you to parameterize the nerd. The [definition is here](./src/prebuilt/revision/personality_nerd.ts) and the output looks like this - the personality I specified was "a klingon warrior who is getting flustered as he attempts to write technical documentation accessible to human engineers":

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

### Prebuilt Revision Nerd: TypoNerd

This one is very basic, it just seeks to identify typos in a given text. Honestly this is probably not the best use of LLMs since we already have spellcheck, but it was trivial to throw together and test so here we are. Definition is [here](./src/prebuilt/revision/typo_nerd.ts) and sample output is here:

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

### Prebuilt Findings Nerd: WikipediaResearchNerd

This is more of a demo of using tools than a functionally useful nerd itself. This nerd is instructed to have ADHD and go down a wikipedia rabbit hole researching a given prompt, so the result can be a bit random. I used "the minions" as my initial prompt. Unlike the revisions nerds above, a Findings nerd just returns a list of findings. The source is [here](./src/prebuilt/findings/wikipedia_research_nerd.ts) and the output looks like this:

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

### Prebuilt Findings Nerd: ConceptExtractorNerd

This is the most complex nerd yet. It's wired up to a pinecone backend. You give it a content domain and it seeks to extract concepts related to that domain from a given text. Instead of just returning the concepts, though, first it checks them against a vector store that contains a list of canonical concepts. If an existing concept would suffice instead of an extracted one it replaces the initial suggestion with the canonical one. Then it writes all new concepts to the concept store and returns the final list. The source is [here](./src/prebuilt/findings/vector_backed_concept_nerd.ts) and the result looks like this. All returned concepts are in pinecone, too.

**note**: in practice we probably don't want the nerd to write to pinecone, that should be a separate step. But I wanted to make sure that it could, as much for proof-of-concept reasons as anything else. This all works as described.

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
