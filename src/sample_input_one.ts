export const source_text = `# lfg
Myk's playground for prototypes. [Proposed Next Steps Here](./todo.md).

Goal is to build out stuff here and then Joel can extract whatever and integrate it into deployable production codebases as appropriate.

## Architecture
It's all pure vanilla javascript in .mjs files. It's delightful.Not a single type error anywhere to be found.No VSCode screaming because it's somehow using a different runtime again. It's just \`import\` and \`export\` and \`console.log\` and it's beautiful.

I'm developing this entirely using [Github Codespaces](https://github.com/features/codespaces) for now, and sometimes I just push to main. Somebody stop me!

## Repo Structure
* [lib/](./lib/) contains library code that I've written. I don't want to call it \`src/ \` because these libraries are not meant to be executed directly, they're generally going to be run via \`npm run <script-name>\` which will invoke an isolated \`.mjs\` script file which pulls from stuff in \`lib/ \` and performs some behavior.
* [rag-docs](./rag-docs/) contains documents that we want to ingest into our RAG. Currently it just holds the Total Typescript database dump JSON, but we can add more stuff here as we go.
* [scripts/](./scripts/) contains the executable scripts that do the various behaviors we're building out.
* [sample-output/](./sample-output/) holds markdown files demonstrating the output of various scripts, including some thoughts or notes as necessary.
* [.env.example](./.env.example) should be copied, renamed to \`.env\` and populated with actual values. All of the values I'm using are pulled directly from the Course Builder env.
* [package.json](./package.json) contains dependencies and exposes the scripts that this repo is built to demo.
* [README.md](./README.md) is this file.
* [resources.md](./resources.md) is a markdown file that I'm using to keep track of various tools, models, papers, etc. that I'm interested in. If you'd like to learn more about this space in general, there's a lot of cool stuff in here. Be warned: some of these notes are strongly opinionated.
* [todo.md](./todo.md) is a markdown file where I'm keeping track of ideas and proposals for next steps. I'm using this to keep track of what I'm doing and why, and to help me prioritize my work. I'm going to update this as I go, so keep an eye on it.

## Features
This repo's work is divided up into "features" - I'm basically identifying a cool thing I'd like to build, getting buy-in, and then adding a feature to expose it.

### RAG (Retrieval Augmented Generation)
This is our initial stab at a RAG-backed query engine. This prototype imports the Total Typescript JSON file (if you're running this against our existing envars, that work has already been done and the data is in pinecone, so no need to rerun \`rag: init\` unless you want to) and then allows you to ask questions. The question you ask is compared against the nodes extracted from the source, and those nodes that seem most relevant are injected into the query. The response is logged, as well as metadata about which nodes were included, so you can see how it arrived at the answer it arrived at.

Note that right now this is using the default extraction flow, which means it's simply chopping the source material up into chunks and then including whichever chunks seem most relevant to the query. Future work will likely add a knowledge graph.

#### \`rag: init\`
To populate the vector store with the contents of the Total Typescript database dump (stored in \`rag-docs/total-typescript.json\`) you can invoke \`npm run rag: init\`. It will read in the JSON, chunk it up into batches, and then load those batches into pinecone. Once that's done, you can run a query to get RAG-driven answers.

#### \`rag: query\`
To execute a query against this RAG, invoke \`npm run rag:query -- "your question"\`. For a concrete example, [see the output from a random test run here.](sample-output/rag-query-1.md)

**next steps**: we can add additional indexes to this. it's using a vector index by default, we can also add e.g. a summary index, and we can leverage metadata to help us identify the most salient chunks, and to better reference the source material.

### Agent Chat
We provide agents with tools which allow them to semi-autonomously perform tasks.

#### \`agent: react\`
My initial implementation uses the ReAct strategy to parse the user query and then draw from our rag query tool, as well as some basic toy example math tools, to answer questions. It's contrived but it demonstrates tool use - it queries the RAG for an example and then performs a multi-step math operation to generate a response. [See the output here.](sample-output/agent-chat-1.md)

### Nerds
We have several [Nerds](./lib/nerds/README.md) created using [LangChain](https://langchain.com) for tending to a digital garden. I pivoted from LlamaIndex to LangChain for these because they're not really RAG-related at all - LangChain offers composition and tool use and other neat affordances that go beyond what we can get from LlamaIndex.

Rather than document the nerds in more than one place go check 'em out where they live.`