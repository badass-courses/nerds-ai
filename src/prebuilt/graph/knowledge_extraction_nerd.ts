import { DynamicStructuredTool, StructuredTool } from "@langchain/core/tools";
import { BaseNerdOptions } from "../../internals/types.js";
import { GraphNerd } from "./index.js";
import { z } from 'zod';

const default_nerd_config: BaseNerdOptions = {
  name: "Knowledge Extractor Nerd",
  purpose: "Your task is to parse a given text and extract a set of concepts and the relationships between them. You will then feed these into a Gremlin Graph API, and return the generated vertices and edges.",
  do_list: [
    "RETURN AN ERROR IF THE INPUT DOES NOT SPECIFY AN ID STRING FOR THE TEXT TO BE ANALYZED",
    "Identify the concepts in the text that are relevant to text's operational domain.",
    "Deprioritize those concepts that are specific to the text and would not generalize beyond it.",
    "When identifying relationships, seek to capture non-obvious but salient connections between concepts.",
    "If the the text is clearly in part about some technical concept that is not explicitly named you may still extract that concept.",
    "*IMPORTANT* You MUST use all three tools as described in your strategy - the ConceptCanonizer, RelationshipCanonizer, and GraphWriter."
  ],
  do_not_list: [
    "Perform any kind of analysis on the extracted entities and relationships",
    "Re-create any of the concepts or relationships if any have been passed in as already having been identified.",
  ],
  strategy: `Use the following steps to execute your task:
1. *Identify Preliminary Concepts*: Identify 10-15 concepts in the text that can be meaningfully added to a larger knowledge graph over the operational domain of the text.
1.1 *Naming Convention*: The "name" of a concept should be unique and descriptive. These names will be normalized to snake case for storage, so e.g. "buttonAttributes" and "ButtonAttributes" would conflict - be sure not to do that.
1.2 *Labeling Convention*: The "label" of a concept should be a human-readable string, one word prefered, snake-cased otherwise, all caps, no special characters, that describes the concept. This will be used in the visualization of the graph.
2. *Create Canonical Concepts*: Immediately pass the concepts you've identified into the "ConceptCanonizer" tool to identify any existing canonical concepts that match your proposed concepts. LOG THE RESULTS OF THIS STEP.
3. *Identify Relationships*: For each canonical concept, identify which other concepts it is related to. Focus on relationships that would be potentially helpful to know when considering either concept in isolation. Allow the labels to potentially guide your relationship extraction.
4. *Create Canonical Relationships*: Immediately use the "RelationshipCanonizer" tool to ensure you are using canonical relationship labels where possible. LOG THE RESULTS OF THIS STEP.
5. *Prepare Database Write*: Enumerate your canonical concepts and relationships in a gremlin-friendly format, identifying both "vertices_to_add" and then "edges_to_add". Both verticies and edges specify optional "properties" objects - for all V's and E's you create, make sure properties contains { "source": "the ID of the input document" }. 
6. *Write to Graph API*: Pass your "vertices_to_add" and "edges_to_add" data into the "GraphWriter" tool to persist it in the knowledge graph.
7. *CHECK FOR ERRORS*: The GraphWriter will return a results object that will contain any errors that occurred during the write process. If there are any errors, log them to your thoughts and then proceed.
8. *Return Graph Representation*: Finally, return the list of concepts (as verticies) and relationships (as edges) that you've generated.`,
  as_tool_description: "A tool that extracts entities and relationships from a given text and generates a graph representation of the extracted entities and relationships",
}

export type Concept = {
  name: string,
  label: string
}

export type ConceptToolInput = {
  proposed_concepts: Concept[]
}

export type RelationshipToolInput = {
  proposed_relationships: string[]
}

export type Vertex = {
  id: string,
  label: string,
  properties: Record<string, any>
}

export type Edge = {
  id: string,
  label: string,
  from: string,
  to: string,
  properties: Record<string, any>
}

export type GraphData = {
  source_id: string,
  vertices: Vertex[],
  edges: Edge[]
}

export type CanonicalConceptMapping = {
  concept: Concept,
  possible_matches: Concept[]
};

export type CanonicalLabelMapping = {
  label: string,
  possible_matches: string[]
};

export class KnowledgeGraphTools {
  concept_canonizer: (concepts: ConceptToolInput) => Promise<Array<CanonicalConceptMapping>>
  relationship_canonizer: (relationships: RelationshipToolInput) => Promise<Array<CanonicalLabelMapping>>
  graph_writer: (data: GraphData) => Promise<string>

  constructor(
    concept_canonizer: (concepts: ConceptToolInput) => Promise<Array<CanonicalConceptMapping>>,
    relationship_canonizer: (relationships: RelationshipToolInput) => Promise<Array<CanonicalLabelMapping>>,
    graph_writer: (data: GraphData) => Promise<string>
  ) {
    this.concept_canonizer = concept_canonizer
    this.relationship_canonizer = relationship_canonizer
    this.graph_writer = graph_writer
  }

  concept_canonizer_tool = (): StructuredTool => new DynamicStructuredTool({
    name: "ConceptCanonizer",
    description: "This tool takes a list of proposed concepts with `name` and `label` fields, and returns set of proposed canonical concepts that seek to reuse existing names and labels where appropriate for each.",
    func: async (concepts: ConceptToolInput): Promise<string> => {
      console.log("[TOOL INVOKED] Concept Canonizer!", JSON.stringify(concepts))
      const proposals = await this.concept_canonizer(concepts)
      return JSON.stringify(proposals)
    },
    schema: z.object({
      proposed_concepts: z.array(z.object({
        name: z.string(),
        label: z.string()
      }))
    })
  })

  relationship_canonizer_tool = (): StructuredTool => new DynamicStructuredTool({
    name: "RelationshipCanonizer",
    description: "This tool takes a list of proposed relationship labels and returns a set of proposed canonical relationship labels that seek to reuse existing labels where appropriate.",
    func: async (relationships: RelationshipToolInput): Promise<string> => {
      console.log("[TOOL INVOKED] Relationship Canonizer!", JSON.stringify(relationships))
      const proposals = await this.relationship_canonizer(relationships)
      return JSON.stringify(proposals)
    },
    schema: z.object({
      proposed_relationships: z.array(z.string())
    })
  })

  graph_writer_tool = (): StructuredTool => new DynamicStructuredTool({
    name: "GraphWriter",
    description: "This tool takes a set of verticies and edges and writes them to a Gremlin graph database.",
    func: async (data: GraphData): Promise<string> => {
      console.log("[TOOL INVOKED] Graph Writer!", JSON.stringify(data))
      const result = await this.graph_writer(data)
      return JSON.stringify(result)
    },
    schema: z.object({
      source_id: z.string(),
      vertices: z.array(z.object({
        id: z.string(),
        label: z.string(),
        properties: z.record(z.string())
      })),
      edges: z.array(z.object({
        id: z.string(),
        label: z.string(),
        from: z.string(),
        to: z.string(),
        properties: z.record(z.string())
      }))
    })
  })

  tools = (): StructuredTool[] => {
    return [
      this.concept_canonizer_tool(),
      this.relationship_canonizer_tool(),
      this.graph_writer_tool()
    ]
  }
}

export class KnowledgeExtractionNerd extends GraphNerd {
  constructor(knowledge_graph_tools: KnowledgeGraphTools, nerd_config: BaseNerdOptions = default_nerd_config) {
    nerd_config.tools = knowledge_graph_tools.tools()
    super(nerd_config)
  }
}