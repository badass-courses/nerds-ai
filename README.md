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
At its core a nerd is an object that defines what the LLM does and how. This is mostly used to implement the system message, and contains a few parameterizable things. The `parser` and `agent_specifier` come into play when binding the nerd to an LLM for actual execution, see below.

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
Once you have a BaseNerd you can bind it to an LLM. Currently out of the box this library supports OpenAI, Anthropic and Google LLMs. The `NerdPlatformBinder` class exposes a `.bindToPlatform(platform, platform_opts?)` method which returns the invocable nerd object that's ready to use.

Depending on the output parser specified and which agent_specifier you're using the binding operation will make a bunch of configuration choices and serve up an invocable object that looks like this:

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

## Project Next Steps
I've got a lot of things I'd like to add to this project, here is a general list:

* [ ] Add chat memory and conversational context to the nerds so they're not just one-and-done if you don't want them to be.
* [ ] Building on the ConceptExtraction model with vector-store based canonical concepts, I want to build a graph data extractor. The idea would be to extract a graph of concepts from a given text, and then use that graph to build a structured JSON object that represents the relationships between those concepts and persist it in something like Nebula. This graph can then be used via a RAG flow to feed into other nerds.
* [ ] Add input pre-processors so that nerds can do things like insert line-number annotations and other things to their input prior to running them.
* [ ] Make `agent_specifier` completely internal. In practice every decision it makes should be able to be automated based on e.g. whether or not the nerd is using tools, and which platform we're running against.
* [ ] Create a `DynamicToolNerd` which is designed to allow users to implement tools with specific signatures at runtime. This way we could e.g. implement a ConceptStore nerd that has its own bespoke database accessors that e.g. perform I/O against a dynamically defined pinecone index and also allow writes to a separate K/V store that actually tracks concepts, etc.
* [ ] LangChain exposes an experimental AutoGPT feature. I haven't dug too deeply into this yet, but I think that I can swing this in a way that would allow me to build an "AutoNerd" that has access to the full suite of nerds as well as the capacity implement entirely new nerds as it runs. This could then become the "Digital Gardener" we've talked about, constantly running against the entire suite of content and proposing revisions constantly over time without needing to be invoked directly.

## Prebuilt Nerds
This is a running list of prebuilt nerds including sample outputs when run against a document from the egghead source material. The input document is not checked into the repo because those texts are proprietary, I'm happy to share them with other egghead folks if you want to run them yourselves or you can run them against your own stuff.

There are currently two different kinds of nerds - those that return a markdown string and those that return a structured JSON object. The markdown string nerds are generally used for simple tasks like summarization, while the structured JSON nerds are used for more complex tasks like proposing revisions to a text. The prebuilt nerds are currently all built to return JSON.

There are currently two JSON output types defined. Both return an object with a `chain_of_thought` string array as well as a typed payload.
* `Findings` - A Findings nerd is really straightforward. It simply returns an array of strings that represent the findings of the nerd. This is useful to prepare concise input to other nerds, for instance.
* `Revisions` - A Revisions nerd is a bit more ambitious. Given some text input, it returns a list of proposed revisions to that text. The idea is that a user can then accept/reject those revisions via some user interface, seamlessly mutating the text.

I've got a number of different kinds of prebuilt nerds that implement these two basic types, and as you can see it's hopefully pretty straightforward to define new ones. The examples you'll find below are all defined in [./scripts/simple](./scripts/simple/) and you can run them yourself if you have the appropriate environment variables defined and can supply text input. Note that we are generating inputs only against OpenAI, but all tools except wiki and content extraction are available for Anthropic and Google as well. The tool-using nerds (wiki and context) require a tool-using LLM, and currently Gemini doesn't support that so they won't work with Gemini, but work fine with Anthropic as well as OpenAI.

**note on revision output**: The `line` field is not at all reliable. I'm going to add an input preprocessor to these nerds that inserts line numbers on every line, and I'm hoping that with that in place the LLM will be able to more accurately identify the line on which a given revision should be made.

### Prebuilt Revision Nerd: AccessibleLanguageNerd
This nerd takes a text input and returns a list of proposed revisions to make the text more accessible. This is a good example of a nerd that returns a `Revisions` object. The [definition](./src/prebuilt/revision/accessible_language_nerd.ts) is straightforward and easily tunable. The output you'll receive looks like this:

```typescript
{
  chain_of_thought: [
    "First, I'll review the text for clarity and readability, focusing on simplifying complex sentences and ensuring the technical content remains precise.",
    "The title and description seem clear, but I'll check if they can be made more concise or if any technical jargon can be simplified without losing meaning.",
    "In the main content, I'll look for any overly complex sentences or awkward wording that could be simplified to make the text more accessible to readers who might not be familiar with TypeScript or programming concepts.",
    "I'll also ensure that any code snippets are correctly explained and that their purpose is clear in the context of the surrounding text.",
    "Finally, I'll check for consistency in terminology and formatting to ensure the document is professional and easy to follow."
  ],
  proposed_edits: [
    {
      line_number: 3,
      existing_text: 'An interesting property of as const is that it can be used to infer strings as their literal types in objects.',
      proposed_replacement: "A useful feature of 'as const' is that it allows strings to be recognized as their specific literal types within objects.",
      reasoning: "Simplifying the sentence structure and using 'allows' instead of 'can be used' makes the sentence more direct and easier to understand.",
      confidence: 0.9
    },
    {
      line_number: 5,
      existing_text: "There's another interesting feature of `as const`, which we'll see in this example.",
      proposed_replacement: "Let's explore another feature of `as const` through this example.",
      reasoning: "Rephrasing to a more active voice ('Let's explore') engages the reader and simplifies the sentence.",
      confidence: 0.9
    },
    {
      line_number: 7,
      existing_text: 'The `modifyButton` function accepts an `attributes` object typed as `ButtonAttributes`, which has `type` values of "button," "submit," or "reset".',  
      proposed_replacement: 'The `modifyButton` function takes an `attributes` object of type `ButtonAttributes`, which specifies the `type` as either "button", "submit", or "reset".',
      reasoning: "Simplifying 'accepts' to 'takes' and rephrasing the description of `type` values makes the sentence clearer and more direct.",
      confidence: 0.9
    },
    {
      line_number: 13,
      existing_text: "As we've seen, we can fix this by adding `as const` to the `buttonAttributes` object, which makes the entire object read-only:",
      proposed_replacement: 'As demonstrated, this issue can be resolved by adding `as const` to the `buttonAttributes` object, making it read-only:',
      reasoning: "Using 'As demonstrated' instead of 'As we've seen' and 'this issue can be resolved' instead of 'we can fix this' makes the sentence more formal and precise.",
      confidence: 0.9
    },
    {
      line_number: 21,
      existing_text: "However, this time the `type` property here is not read-only, but it's inferred as its literal type:",
      proposed_replacement: 'In this case, the `type` property is not read-only, but it is still recognized as its literal type:',
      reasoning: "Simplifying the sentence and using 'recognized' instead of 'inferred' makes the technical detail clearer and more accessible.",
      confidence: 0.9
    },
    {
      line_number: 29,
      existing_text: "Even with `as const` applied, we're still able to modify the `type` property but only to be one of the allowed literal types:",
      proposed_replacement: 'Even after applying `as const`, you can still change the `type` property, but only to one of the permitted literal types:',
      reasoning: "Rephrasing for clarity and using 'you can' instead of 'we're' makes the sentence more direct and personal to the reader.",
      confidence: 0.9
    }
  ]
}
```

### Prebuilt Revision Nerd: CodeSnippetTunerNerd
This one is a bit tricky because we're running it against source texts that sometimes include intentionally incorrect code snippets. I've attempted to account for that. The goal here is to improve any code snippets found in a source text, where "improve" is defined fairly broadly. The [definition](./src/prebuilt/revision/code_snippet_tuner_nerd.ts) is here and we can continue to tweak it. The output you'll receive looks like this:

```typescript
{
  chain_of_thought: [
    "First, I'll check the code snippets for syntax errors or inconsistencies.",
    "In the TypeScript code snippet where 'buttonAttributes' is defined, there's a syntax error with the use of a semicolon instead of a comma in the object definition. This needs to be corrected to a comma for proper object syntax.",
    "Next, I'll verify if the use of 'as const' is correctly demonstrated and if the comments in the code snippets align with the expected behavior of TypeScript.",
    "The last code snippet incorrectly states that the 'type' property can still be modified after applying 'as const'. This is incorrect because 'as const' makes properties read-only. This needs clarification or correction to avoid misleading readers."
  ],
  proposed_edits: [
    {
      line_number: 19,
      existing_text: 'type: "button";',
      proposed_replacement: 'type: "button",',
      reasoning: 'The semicolon should be a comma to correctly define an object in TypeScript.',
      'multiple_matches?': true,
      confidence: 1
    },
    {
      line_number: 39,
      existing_text: 'buttonAttributes.type = "button";',
      proposed_replacement: '',
      reasoning: "This line should be removed because it incorrectly suggests that the 'type' property can be modified after it has been declared with 'as const', which is not possible as 'as const' makes it read-only.",
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
  chain_of_thought: [
    'First, I need to channel a Klingon warrior who is trying to write technical documentation for human engineers. Klingons are known for their directness and might use a more commanding tone, even when flustered. They might also express frustration or confusion in a straightforward manner.',
    "The document is about TypeScript's 'as const' feature. I need to ensure that the technical content remains accurate while infusing the personality of a flustered Klingon warrior.",
    "I'll look for opportunities to make the language more direct and possibly include expressions of frustration or challenge, which would be characteristic of a Klingon struggling with the task.",
    "I'll also ensure that any changes I make do not alter the technical accuracy of the document."
  ],
  proposed_edits: [
    {
      line_number: 3,
      existing_text: 'An interesting property of as const is that it can be used to infer strings as their literal types in objects.',
      proposed_replacement: 'Behold the power of as const, which allows us to infer strings as their literal types in objects!',
      reasoning: "Changing 'An interesting property' to 'Behold the power' adds a dramatic flair typical of Klingon speech, making the sentence more commanding and impactful.",
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 5,
      existing_text: "There's another interesting feature of `as const`, which we'll see in this example.",
      proposed_replacement: 'Prepare for another formidable feature of `as const`, as demonstrated in this example.',
      reasoning: "Replacing 'There's another interesting feature' with 'Prepare for another formidable feature' increases the intensity and anticipation, aligning with a Klingon's dramatic and direct communication style.",
      'multiple_matches?': false,
      confidence: 0.9
    },
    {
      line_number: 17,
      existing_text: 'which causes an error when passing it into the `modifyButton` function:',
      proposed_replacement: 'which leads to a frustrating error when attempting to pass it into the `modifyButton` function:',
      reasoning: "Adding 'frustrating' and 'attempting' expresses a sense of struggle and annoyance, which would be characteristic of a flustered Klingon.",
      'multiple_matches?': false,
      confidence: 0.85
    },
    {
      line_number: 29,
      existing_text: "However, this time the `type` property here is not read-only, but it's inferred as its literal type:",
      proposed_replacement: 'However, in this instance, the `type` property is not shackled as read-only, yet it is precisely inferred as its literal type:',
      reasoning: "Using 'shackled' instead of 'read-only' and 'precisely' instead of 'inferred' adds a more vivid and intense language, fitting for a Klingon's expressive style.",
      'multiple_matches?': false,
      confidence: 0.85
    }
  ]
}
```

### Prebuilt Revision Nerd: TypoNerd
This one is very basic, it just seeks to identify typos in a given text. Honestly this is probably not the best use of LLMs since we already have spellcheck, but it was trivial to throw together and test so here we are. Definition is [here](./src/prebuilt/revision/typo_nerd.ts) and sample output is here:

```typescript
{
  chain_of_thought: [
    "First, I'll check for any typographical errors such as misspellings or incorrect punctuation.",
    'I noticed that in the TypeScript code snippets, semicolons are used instead of commas in object definitions. This is a syntax error in TypeScript and should be corrected to commas.',
    "I'll propose edits to replace the semicolons with commas in the object definitions to ensure the code is syntactically correct."
  ],
  proposed_edits: [
    {
      line_number: 18,
      existing_text: 'type: "button";',
      proposed_replacement: 'type: "button",',
      reasoning: 'In TypeScript, object properties should be separated by commas, not semicolons.',
      'multiple_matches?': true,
      confidence: 1
    },
    {
      line_number: 30,
      existing_text: 'type: "button";',
      proposed_replacement: 'type: "button",',
      reasoning: 'In TypeScript, object properties should be separated by commas, not semicolons.',
      'multiple_matches?': false,
      confidence: 1
    },
    {
      line_number: 38,
      existing_text: 'type: "button" as const;',
      proposed_replacement: 'type: "button" as const,',
      reasoning: 'In TypeScript, object properties should be separated by commas, not semicolons.',
      'multiple_matches?': false,
      confidence: 1
    }
  ]
}
```

### Prebuilt Findings Nerd: WikipediaResearchNerd
This is more of a demo of using tools than a functionally useful nerd itself. This nerd is instructed to have ADHD and go down a wikipedia rabbit hole researching a given prompt, so the result can be a bit random. I used "Danny Greene", the Rasputin of Cleveland mob politics, as my initial prompt. Unlike the revisions nerds above, a Findings nerd just returns a list of findings. The source is [here](./src/prebuilt/findings/wikipedia_research_nerd.ts) and the output looks like this:

```typescript
{
  chain_of_thought: [
    'First, I looked up Danny Greene to understand his background and significance. I found that he was an American mobster in Cleveland, Ohio, involved in a conflict with the Cleveland crime family which led to his assassination.',
    'Next, I explored the Cleveland Mafia War to see how it connected with Danny Greene. This provided context on the violent struggles within the Cleveland crime family and how Greene attempted to take over criminal rackets in the city.',
    "I then delved deeper into Greene's personal history, discovering his challenging early life, his rise through the ranks of the International Longshoremen's Association, and his eventual leadership in organized crime.",
    'I also examined the broader history of organized crime in Cleveland, which helped me understand the environment in which Danny Greene operated and the historical significance of the Cleveland crime family.'
  ],
  findings: [
    'Danny Greene was an influential American mobster in Cleveland, Ohio, who was involved in a violent conflict with the Cleveland crime family, leading to his assassination in 1977. (https://en.wikipedia.org/wiki/Danny_Greene)',
    "Greene first gained power as the president of the local chapter of the International Longshoremen's Association and later established his own criminal organization, the Celtic Club. (https://en.wikipedia.org/wiki/Danny_Greene)",
    'The Cleveland Mafia War was a significant period of violence in the late 1970s, during which Greene attempted to take over the criminal rackets in Cleveland, drawing intense law enforcement scrutiny. (https://en.wikipedia.org/wiki/Cleveland_Mafia_War)',
    'The Cleveland crime family, also known as the Scalish crime family, has been a major force in organized crime in Cleveland since the early 1900s, influencing labor racketeering and casino operations. (https://en.wikipedia.org/wiki/Cleveland_crime_family)',
    "Danny Greene's assassination was the result of a criminal conspiracy involving Mafia families from Cleveland, New York City, and Southern California, leading to significant federal prosecutions of the Mafia. (https://en.wikipedia.org/wiki/Danny_Greene)"
  ]
}
```

### Prebuilt Findings Nerd: ConceptExtractorNerd
This is the most complex nerd yet. It's wired up to a pinecone backend. You give it a content domain and it seeks to extract concepts related to that domain from a given text. Instead of just returning the concepts, though, first it checks them against a vector store that contains a list of canonical concepts. If an existing concept would suffice instead of an extracted one it replaces the initial suggestion with the canonical one. Then it writes all new concepts to the concept store and returns the final list. The source is [here](./src/prebuilt/findings/vector_backed_concept_nerd.ts) and the result looks like this. All returned concepts are in pinecone, too.

**note**: in practice we probably don't want the nerd to write to pinecone, that should be a separate step. But I wanted to make sure that it could, as much for proof-of-concept reasons as anything else. This all works as described.

```typescript
{
  chain_of_thought: [
    "First, I need to extract relevant concepts from the provided text. The text discusses TypeScript features, specifically focusing on 'as const' and its usage in type inference and object immutability.",
    "Identified concepts include: 'as const', 'literal type inference', 'read-only properties', 'ButtonAttributes', 'modifyButton function', 'buttonAttributes object', 'modifyButtons function', 'buttonsToChange array'.",
    'Next, I will use the existingConceptFinder tool to check if any of these concepts already exist in the store or if there are similar concepts that could be used instead.',
    'After receiving the results from the existingConceptFinder, I will decide whether to replace any of the extracted concepts with existing ones or add new concepts to the store.',
    'Finally, I will add any new concepts that are not already in the store using the addConceptsToStore tool and return the final list of concepts.'
  ],
  findings: [
    'as const',
    'literal type inference',
    'read-only properties',
    'ButtonAttributes',
    'modifyButton function',
    'buttonAttributes object',
    'modifyButtons function',
    'buttonsToChange array'
  ]
}
```