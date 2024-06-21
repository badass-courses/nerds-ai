import { Nerd } from "../../nerd.js"
import { BaseNerdOptions } from "../../internals/types.js"
import { NerdOutput } from "../../internals/parsers/index.js"
import { JsonNerdOutputParser } from "../../internals/parsers/json/index.js"

const schema = `{
  // the "thought_log" array is for tracking your own thoughts as you carry out your task.
  // Please log your process and observations here as you go, ensuring to keep your thoughts in order.
  // Use these thoughts as you complete your task to help you stay focused.
  "thought_log": string[],

  // This is a graph query result. It contains a set of vertices and edges. A vertex has a name and a label. An edge has a label and then sanitized IDs for "from" and "to" vertices.
  // - A "label" is a string that describes the type of vertex or edge.
  // - "from" and "to" are the ids of the vertices that the edge connects.

  // You may be asked to perform any number of graph operations. You may be traversing to satisfy a query, you may be updating a knowledge graph, etc
  // Whatever the operation you're performing, you will be returning the set of salient vertices and edges.

  "vertices": [
    {
      "name": string,
      "label": string,
    }
  ],

  "edges": [
    {
      "label": string,
      "from": string,
      "to": string,
    }
  ]
}`

export type Vertex = {
  id: string,
  name: string,
  label: string,
}

export type Edge = {
  label: string,
  from: string,
  to: string
}

export type GraphResult = NerdOutput & {
  vertices: Vertex[],
  edges: Edge[],
}

export type GraphGuidance = {
  vertex_labels: string[],
  edge_labels: string[],
}

export type KnowledgeGraphInput = {
  source_id: string,
  source_text: string
}

export const graph_update_parser: JsonNerdOutputParser<GraphResult> = new JsonNerdOutputParser<GraphResult>(schema)

export class GraphNerd extends Nerd<KnowledgeGraphInput, GraphResult> {
  constructor(nerd_opts: BaseNerdOptions, parser: JsonNerdOutputParser<GraphResult> = graph_update_parser) {
    super(nerd_opts, parser)
  }
}

export * from "./guidance/index.js"