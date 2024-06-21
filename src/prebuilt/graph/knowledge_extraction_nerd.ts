import { DynamicStructuredTool, StructuredTool } from "@langchain/core/tools";
import { BaseNerdOptions } from "../../internals/types.js";
import { Edge, GraphGuidance, GraphNerd, KnowledgeGraphInput, Vertex } from "./index.js";
import { z } from 'zod';

const default_nerd_config: BaseNerdOptions = {
  name: "Knowledge Extractor Nerd",
  purpose: "Your task is to parse a given text and extract a set of concepts and the relationships between them. You will then feed these into a Graph API, and return the generated vertices and edges.",
  do_list: [
    "RETURN AN ERROR IF THE INPUT DOES NOT SPECIFY AN ID STRING FOR THE TEXT TO BE ANALYZED",
    "Identify the concepts in the text that are relevant to text's operational domain.",
    "When identifying relationships, seek to capture non-obvious but salient connections between concepts.",
    "If the the text is clearly in part about some technical concept that is not explicitly named you may still extract that concept.",
    "*IMPORTANT* You MUST use all three tools as described in your strategy - the ConceptCanonizer, RelationshipCanonizer, and GraphWriter."
  ],
  do_not_list: [
    "Include any concepts that are specific to the text, for instance names of objects or types from code samples or specific examples that are not generally applicable to the operational domain of the text.",
    "Perform any kind of analysis on the extracted entities and relationships",
    "Re-create any of the concepts or relationships if any have been passed in as already having been identified.",
  ],
  strategy: `Use the following steps to execute your task:
1. *Identify Preliminary Concepts*: Identify 10-15 concepts in the text that can be meaningfully added to a larger knowledge graph over the operational domain of the text.
1.1 *Concept Selection*: A "concept" in this case is a noun or noun phrase that represents a distinct idea or object that can be related to other concepts. Concepts should always be salient beyond the current document, they're intended as building blocks for a larger knowledge graph.
1.2 *Label Selection*: The "label" of a concept should be drawn from the 400 most common english nouns, and should be a singular noun.
2. *Create Canonical Concepts*: Immediately pass the concepts you've identified into the "ConceptCanonizer" tool to identify any existing canonical concepts that match your proposed concepts. If you can, reuse an appropriate existing concept that captures the same idea you're trying to isolate.
3. *Identify Relationships*: For each canonical concept, identify which other concepts it is related to. Focus on relationships that would be potentially helpful to know when considering either concept in isolation. Allow the labels to potentially guide your relationship extraction.
3.1 *Relationship Label Selection*: The "label" of a relationship should be drawn from the 400 most common transitive english verbs, and should be in the present tense. "concept name" -> "relationship label" -> "concept name" should scan as a meaningful and clear phrase.
4. *Create Canonical Relationships*: Immediately use the "RelationshipCanonizer" tool to ensure you are using canonical relationship labels where possible. For all returned matches for any given relationship label, reuse an existing one where you can do so without losing the meaning.
5. *Prepare Database Write*: Once you have your canonical concepts and relationships, prepare the data for writing to the graph database. Each concept should be a vertex, and each relationship should be an edge.
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

export type ExistingLabels = {
  vertex_labels: string[],
  edge_labels: string[]
}

export class KnowledgeGraphTools {
  concept_canonizer: (concepts: ConceptToolInput) => Promise<Array<CanonicalConceptMapping>>
  relationship_canonizer: (relationships: RelationshipToolInput) => Promise<Array<CanonicalLabelMapping>>
  graph_writer: (data: GraphData) => Promise<string>
  list_labels: () => Promise<ExistingLabels>

  constructor(
    concept_canonizer: (concepts: ConceptToolInput) => Promise<Array<CanonicalConceptMapping>>,
    relationship_canonizer: (relationships: RelationshipToolInput) => Promise<Array<CanonicalLabelMapping>>,
    graph_writer: (data: GraphData) => Promise<string>,
    list_labels: () => Promise<ExistingLabels>
  ) {
    this.concept_canonizer = concept_canonizer
    this.relationship_canonizer = relationship_canonizer
    this.graph_writer = graph_writer
    this.list_labels = list_labels
  }

  concept_canonizer_tool = (): StructuredTool => new DynamicStructuredTool({
    name: "ConceptCanonizer",
    description: "This tool takes a list of proposed concepts with `name` and `label` fields, and returns set of proposed canonical concepts that seek to reuse existing names and labels where appropriate for each.",
    func: async (concepts: ConceptToolInput): Promise<string> => {
      console.log("[TOOL INVOKED] Concept Canonizer!", JSON.stringify(concepts))
      const proposals = await this.concept_canonizer(concepts)
      const string_output = JSON.stringify(proposals, null, 2)
      console.log(" [TOOL RESULT] Concept Canonizer!", string_output)
      return string_output
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
      const string_output = JSON.stringify(proposals, null, 2)
      console.log(" [TOOL RESULT] Relationship Canonizer!", string_output)
      return string_output
    },
    schema: z.object({
      proposed_relationships: z.array(z.string())
    })
  })

  graph_writer_tool = (): StructuredTool => new DynamicStructuredTool({
    name: "GraphWriter",
    description: "This tool takes a set of verticies and edges and writes them to a graph database. It also updates the vector stores for both vertices and edge labels to allow us to reuse existing canonical names later.",
    func: async (data: GraphData): Promise<string> => {
      console.log("[TOOL INVOKED] Graph Writer!", JSON.stringify(data))
      const result = await this.graph_writer(data)
      const string_output = JSON.stringify(result, null, 2)
      console.log(" [TOOL RESULT] Graph Writer!", string_output)
      return string_output
    },
    schema: z.object({
      source_id: z.string(),
      vertices: z.array(z.object({
        name: z.string(),
        label: z.string(),
      })),
      edges: z.array(z.object({
        label: z.string(),
        from: z.string(),
        to: z.string(),
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
  get_existing_labels: () => Promise<ExistingLabels>
  guidance: GraphGuidance

  constructor(knowledge_graph_tools: KnowledgeGraphTools, graph_guidance: GraphGuidance, nerd_config: BaseNerdOptions = default_nerd_config) {
    nerd_config.tools = knowledge_graph_tools.tools()
    super(nerd_config)
    this.get_existing_labels = knowledge_graph_tools.list_labels
    this.guidance = graph_guidance
  }

  public override async stringify_input(input: KnowledgeGraphInput, runtime_instructions: string): Promise<{ input: string, runtime_instructions: string }> {
    console.log("\n\n\n\nWE ARE OVERRIDING THE STRINGIFY INPUT METHOD\n\n\n\n")
    const updated_runtime_instructions = runtime_instructions + "\n\n" + await this.build_runtime_instructions()
    return super.stringify_input(input, updated_runtime_instructions)
  }

  public async build_runtime_instructions(): Promise<string> {
    const existing_labels = await this.get_existing_labels()

    return `The canonical data in the graph includes the following vertex and edge labels. 
    
    When extracting concepts and relationships, you should seek to reuse these labels where possible to ensure consistency and reduce the number of unique labels in the graph.
    You *MAY* use additional labels if the existing labels fail to adequately capture the complexity of the document's data.
    
    Canonical labels are here to guide your selection and extraction process. 
    You *SHOULD* seek to identify concepts that satisfy the existing labels where possible.
    
    Canonical Vertex Labels:
    ${this.guidance.vertex_labels.concat(existing_labels.vertex_labels.join(", "))}

    Canonical Edge Labels:
    ${this.guidance.edge_labels.concat(existing_labels.edge_labels.join(", "))}
    `
  }
}