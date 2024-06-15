import { Nerd } from "../../nerd.js"
import { BaseNerdOptions } from "../../internals/types.js"
import { NerdOutput } from "../../internals/parsers/index.js"
import { JsonNerdOutputParser } from "../../internals/parsers/json/index.js"
import { Vertex, Edge } from 'gremlin'

const schema = `{
  // the "thought_log" array is for tracking your own thoughts as you carry out your task.
  // Please log your process and observations here as you go, ensuring to keep your thoughts in order.
  // Use these thoughts as you complete your task to help you stay focused.
  "thought_log": string[],

  // This is a graph query result. It contains a set of vertices and edges defined using the Gremlin format.
  // - An "id" is a unique identifier for the vertex or edge.
  // - A "label" is a string that describes the type of vertex or edge.
  // - "from" and "to" are the ids of the vertices that the edge connects.
  // - "properties" is a map of key-value pairs that describe the vertex or edge.

  // You may be asked to perform any number of graph operations. You may be traversing to satisfy a query, you may be updating a knowledge graph, etc
  // Whatever the operation you're performing, you will be returning the set of salient vertices and edges.

  // the "source" property on both edges and vertices should always be identical, and set to the ID of the input document.

  "vertices": [
    {
      "id": string,
      "label": string,
      "properties": {
        "source": string,
        [key: string]: string
      }
    }
  ],

  "edges": [
    {
      "id": string,
      "label": string,
      "from": string,
      "to": string,
      "properties": {
        source: string,
        [key: string]: string
      }
    }
  ]
}`


export type GraphResult = NerdOutput & {
  vertices: Vertex[],
  edges: Edge[],
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