import { DiagramNode } from './diagramNode.ts';
import { Path } from '../geometry/path.ts';

export type NodeCapability = string;

// TODO: Make make this into an interface in the global namespace we can extend
export type CustomPropertyDefinition = {
  type: 'number';
  label: string;
  value: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
};

export interface NodeDefinition {
  type: string;
  name: string;

  supports(capability: NodeCapability): boolean;

  getBoundingPath(node: DiagramNode): Path;
  getCustomProperties(node: DiagramNode): Record<string, CustomPropertyDefinition>;
}

export class NodeDefinitionRegistry {
  private nodes: Record<string, NodeDefinition> = {};

  register(node: NodeDefinition) {
    this.nodes[node.type] = node;
  }

  get(type: string): NodeDefinition {
    return this.nodes[type];
  }

  getAll() {
    return Object.values(this.nodes);
  }
}

export type EdgeCapability = string;

export interface EdgeDefinition {
  type: string;

  supports(capability: EdgeCapability): boolean;
}

export class EdgeDefinitionRegistry {
  private edges: Record<string, EdgeDefinition> = {};

  register(edge: EdgeDefinition) {
    this.edges[edge.type] = edge;
  }

  get(type: string): EdgeDefinition {
    return this.edges[type];
  }
}