import { DynamicStructuredTool, StructuredTool } from "@langchain/core/tools";
import { BaseNerdOptions } from "../../internals/types.js";
import { Edge, GraphData, GraphGuidance, GraphNerd, GraphResult, KnowledgeGraphInput } from "./index.js";
import { z } from 'zod';

const default_nerd_config: BaseNerdOptions = {
  name: "Knowledge Extractor Nerd",
  purpose: "Your task is to parse a given text and extract a set of concepts and the relationships between them. You will then feed these into a Graph API, and return the generated vertices and edges.",
  do_list: [
    "Identify the concepts in the text that are relevant to text's operational domain.",
    "When identifying relationships, seek to capture non-obvious but salient connections between concepts.",
    "If the the text is clearly in part about some technical concept that is not explicitly named you may still extract that concept.",
    "Relationship labels should convey a specific relationship with specific semantics. Generic relations aren't helpful.",
    "*IMPORTANT* You MUST use the ConceptCanonizer tool to identify existing canonical concepts that match your proposed concepts. Please reuse existing concepts where possible so that our overall set of concepts converges over time."
  ],
  do_not_list: [
    "*IMPORTANT* DO NOT Include any concepts that are specific to the text, for instance names of objects or types from code samples or specific examples that are not generally applicable to the operational domain of the text.",
    "*IMPORTANT* DO NOT Use any relationship labels that are too generic, like 'uses' or 'has'. These are not helpful in a knowledge graph."
  ],
  strategy: `Use the following steps to execute your task:
1. *Identify Preliminary Concepts*: Identify as many concepts as you can in the text that can be meaningfully added to a larger knowledge graph over the operational domain of the text.
1.1 *Concept Selection*: A "concept" in this case is a noun or noun phrase that represents a distinct idea or object that can be related to other concepts. Concepts should always be salient beyond the current document, they're intended as building blocks for a larger knowledge graph.
1.2 *Concept Label Selection*: The "label" of a concept should be drawn from the 400 most common english nouns, and should be a singular noun. You should receive some guidance in the form of extant concepts - you should try to reuse those, but may add new ones if they're not sufficient.
2. *Create Canonical Concepts*: Immediately pass the concepts you've identified into the "ConceptCanonizer" tool to identify any existing canonical concepts that match your proposed concepts. If you can, reuse an appropriate existing concept that captures the same idea you're trying to isolate.
3. *Identify Relationships*: For each canonical concept, identify which other concepts it is related to. Focus on relationships that would be potentially helpful to know when considering either concept in isolation. 
3.1 *Relationship Label Selection*: The "label" of a relationship should be drawn from the 400 most common transitive english verbs, and should be in the present tense. "concept name" -> "relationship label" -> "concept name" should scan as a meaningful and clear phrase.
3.2 "Relationship Label Guidance*: You may be provided with a list of existing canonical relationship labels. Whereever possible, strive to use those - but you may add new ones if the existing list fails to capture an important aspect of the text.
4. *Return Graph Representation*: Finally, return the list of concepts (as verticies) and relationships (as edges) that you've generated.`,
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
  graph_writer: (data: GraphData) => Promise<string>
  list_labels: () => Promise<ExistingLabels>
  get_existing_relationships_for_source: (source_id) => Promise<Edge[]>
  get_existing_concepts_for_source: (source_id) => Promise<Concept[]>

  constructor(
    concept_canonizer: (concepts: ConceptToolInput) => Promise<Array<CanonicalConceptMapping>>,
    graph_writer: (data: GraphData) => Promise<string>,
    list_labels: () => Promise<ExistingLabels>,
    get_existing_relationships_for_source: (source_id) => Promise<Edge[]>,
    get_existing_concepts_for_source: (source_id) => Promise<Concept[]>
  ) {
    this.concept_canonizer = concept_canonizer
    this.graph_writer = graph_writer
    this.list_labels = list_labels
    this.get_existing_relationships_for_source = get_existing_relationships_for_source
    this.get_existing_concepts_for_source = get_existing_concepts_for_source
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

  tools = (): StructuredTool[] => {
    return [
      this.concept_canonizer_tool()
    ]
  }
}

export class KnowledgeExtractionNerd extends GraphNerd {
  get_existing_labels: () => Promise<ExistingLabels>
  write_graph: (data: GraphData) => Promise<string>
  get_existing_relationships_for_source: (source_id) => Promise<Edge[]>
  get_existing_concepts_for_source: (source_id) => Promise<Concept[]>
  guidance: GraphGuidance

  constructor(knowledge_graph_tools: KnowledgeGraphTools, graph_guidance: GraphGuidance, nerd_config: BaseNerdOptions = default_nerd_config) {
    nerd_config.tools = knowledge_graph_tools.tools()
    super(nerd_config)
    this.get_existing_labels = knowledge_graph_tools.list_labels
    this.write_graph = knowledge_graph_tools.graph_writer
    this.get_existing_relationships_for_source = knowledge_graph_tools.get_existing_relationships_for_source
    this.get_existing_concepts_for_source = knowledge_graph_tools.get_existing_concepts_for_source
    this.guidance = graph_guidance
  }

  public override async stringify_input(input: KnowledgeGraphInput, runtime_instructions: string): Promise<{ input: string, runtime_instructions: string }> {
    const existing_concepts = await this.inject_already_extracted_concepts(input.source_id)
    const existing_relationships = await this.inject_already_extracted_relationships(input.source_id)
    const guidance = await this.inject_guidance()
    const updated_runtime_instructions = runtime_instructions + "\n\n" + existing_concepts + existing_relationships + guidance
    return super.stringify_input(input, updated_runtime_instructions)
  }

  public override async postprocess_output(raw_output: string): Promise<GraphResult> {
    const typedOutput: GraphResult = await super.postprocess_output(raw_output)
    await this.write_graph(typedOutput)
    return typedOutput;
  }

  public async inject_already_extracted_concepts(source_id: string): Promise<string> {
    const existing_concepts = await this.get_existing_concepts_for_source(source_id)
    if (existing_concepts.length === 0) return ""
    return `### Existing Concepts
The following concepts have already been extracted from this source. You may reuse these concepts in your extraction process when identifying new relationships, but there is no need to re-extract them.
${existing_concepts.map((concept) => {
      return `* ${concept.name} (${concept.label})`
    }).join("\n")
      }

`
  }

  public async inject_already_extracted_relationships(source_id: string): Promise<string> {
    const existing_relationships = await this.get_existing_relationships_for_source(source_id)
    if (existing_relationships.length === 0) return ""
    return `### Existing Relationships
The following relationships have already been extracted from this source. 
** IMPORTANT ** DO NOT extract relationships that replicate or even parallel these existing relationships. 
You should seek to identify new relationships that are not already present in the graph:
${existing_relationships.map((edge) => {
      return `* ${edge.from} -> ${edge.label} -> ${edge.to}`
    }).join("\n")
      }

`
  }

  public async inject_guidance(): Promise<string> {
    const existing_labels = await this.get_existing_labels()


    return `### Graph Guidance
The canonical data in the graph includes the following vertex and edge labels. 
    
When extracting concepts and relationships, you should seek to reuse these labels where possible to ensure consistency and reduce the number of unique labels in the graph.
      You * MAY * use additional labels if the existing labels fail to adequately capture the complexity of the document's data.

Canonical labels are here to guide your selection and extraction process.
      You * SHOULD * seek to identify concepts that satisfy the existing labels where possible.

Canonical Vertex Labels:
${this.guidance.vertex_labels.join(", ")}

    Additionally, the following additional vertex labels have been used in this domain:
${existing_labels.vertex_labels.filter((label) => !this.guidance.vertex_labels.includes(label)).filter(label => label !== "Document").join(", ")}

Canonical Edge Labels:
${this.guidance.edge_labels.join(", ")}

    Additionally, the following additional edge labels have been used in this domain:
${existing_labels.edge_labels.filter((label) => !this.guidance.edge_labels.includes(label)).filter(label => label !== "REFERENCES").join(", ")}

`
  }
}