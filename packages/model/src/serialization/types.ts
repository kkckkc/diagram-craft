import type { EdgeInterface, NodeInterface } from '../types';
import { Point } from '@diagram-craft/geometry/point';
import type { EdgePropsForEditing } from '../diagramEdge';
import type { NodePropsForEditing, NodeTexts } from '../diagramNode';
import type { OffsetType } from '../endpoint';
import type { StylesheetSnapshot } from '../unitOfWork';
import type { DataSchema } from '../diagramDocumentDataSchemas';
import type { Canvas } from '../diagram';
import type { AdjustmentRule } from '../diagramLayerRuleTypes';
import type { DataTemplate } from '../diagramDocument';

export interface Reference {
  id: string;
}

export type SerializedLayer = { id: string; name: string; type: 'layer' } & (
  | {
      layerType: 'regular' | 'basic';
      elements: ReadonlyArray<SerializedElement>;
    }
  | {
      layerType: 'reference';
      diagramId: string;
      layerId: string;
    }
  | {
      layerType: 'rule';
      rules: ReadonlyArray<AdjustmentRule>;
    }
);

export type SerializedDiagram = {
  id: string;
  name: string;
  layers: ReadonlyArray<SerializedLayer>;
  activeLayerId?: string;
  diagrams: ReadonlyArray<SerializedDiagram>;
  zoom?: {
    x: number;
    y: number;
    zoom: number;
  };
  canvas: Canvas;
};

export interface SerializedDiagramDocument {
  diagrams: ReadonlyArray<SerializedDiagram>;
  attachments?: Record<string, string>;
  customPalette: ReadonlyArray<string>;
  styles: SerializedStyles;
  schemas: ReadonlyArray<DataSchema>;
  props?: {
    stencils?: ReadonlyArray<string>;
    query?: {
      history?: ReadonlyArray<[string, string]>;
      saved?: ReadonlyArray<[string, string]>;
    };
  };
  data?: {
    providerId?: string;
    data?: string;
    templates: DataTemplate[];
  };
}

export interface SerializedStyles {
  edgeStyles: ReadonlyArray<SerializedStylesheet>;
  nodeStyles: ReadonlyArray<SerializedStylesheet>;
}

export type SerializedStylesheet = Omit<StylesheetSnapshot, '_snapshotType'>;

export interface SerializedNode extends NodeInterface {
  edges?: Record<string, ReadonlyArray<Reference>>;
  children?: ReadonlyArray<SerializedElement>;
  props: NodePropsForEditing;
  metadata: ElementMetadata;
  texts: NodeTexts;
}

export type SerializedPointInNodeEndpoint = {
  ref?: Point;
  node: Reference;
  position?: Point;
  offset: Point;
  offsetType?: OffsetType;
};
export type SerializedAnchorEndpoint = {
  anchor: string;
  node: Reference;
  position?: Point;
  offset: Point;
};
export type SerializedFreeEndpoint = { position: Point };

export type SerializedEndpoint =
  | SerializedAnchorEndpoint
  | SerializedPointInNodeEndpoint
  | SerializedFreeEndpoint;

export interface SerializedEdge extends EdgeInterface {
  start: SerializedEndpoint;
  end: SerializedEndpoint;
  props: EdgePropsForEditing;
  metadata: ElementMetadata;
  children?: ReadonlyArray<SerializedElement>;
}

export type SerializedElement = SerializedNode | SerializedEdge;
