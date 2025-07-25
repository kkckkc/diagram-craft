import { Diagram } from '../diagram';
import { DiagramDocument } from '../diagramDocument';
import { Layer } from '../diagramLayer';
import { DiagramElement, isEdge, isNode } from '../diagramElement';
import {
  SerializedDiagram,
  SerializedDiagramDocument,
  SerializedElement,
  SerializedLayer,
  SerializedNode,
  SerializedStyles
} from './types';
import { NotImplementedYet, VerifyNotReached } from '@diagram-craft/utils/assert';
import { AttachmentManager } from '../attachment';
import { DiagramPalette } from '../diagramPalette';
import { DiagramStyles } from '../diagramStyles';
import { DiagramDocumentDataSchemas } from '../diagramDocumentDataSchemas';
import { ReferenceLayer } from '../diagramLayerReference';
import { RuleLayer } from '../diagramLayerRule';
import { RegularLayer } from '../diagramLayerRegular';

export const serializeDiagramDocument = async (
  document: DiagramDocument
): Promise<SerializedDiagramDocument> => {
  return {
    diagrams: document.diagrams.map(serializeDiagram),
    attachments: await serializeAttachments(document.attachments),
    customPalette: serializeCustomPalette(document.customPalette),
    styles: serializeStyles(document.styles),
    schemas: serializeSchemas(document.data.schemas),
    props: {
      query: {
        history: document.props.query.history,
        saved: document.props.query.saved
      },
      stencils: document.props.recentStencils.stencils
    },
    data: {
      providerId: document.data.provider?.id,
      data: document.data.provider?.serialize(),
      templates: document.data.templates.all
    }
  };
};

const serializeCustomPalette = (customPalette: DiagramPalette): string[] => {
  return customPalette.colors;
};

const serializeStyles = (styles: DiagramStyles): SerializedStyles => {
  return {
    edgeStyles: styles.edgeStyles.map(e => e.snapshot()),
    nodeStyles: styles.nodeStyles.map(e => e.snapshot())
  };
};

const serializeSchemas = (schemas: DiagramDocumentDataSchemas) => {
  return schemas.all;
};

const serializeAttachments = async (
  attachments: AttachmentManager
): Promise<Record<string, string>> => {
  attachments.pruneAttachments();

  const dest: Record<string, string> = {};
  for (const [hash, attachment] of attachments.attachments) {
    if (attachment.inUse) {
      const buf = await attachment.content.arrayBuffer();
      dest[hash] = btoa(
        Array.from(new Uint8Array(buf))
          .map(b => String.fromCharCode(b))
          .join('')
      );
    }
  }

  return dest;
};

export const serializeDiagram = (diagram: Diagram): SerializedDiagram => {
  return {
    id: diagram.id,
    name: diagram.name,
    layers: diagram.layers.all.map(l => serializeLayer(l)),
    activeLayerId: diagram.activeLayer.id,
    diagrams: diagram.diagrams.map(d => serializeDiagram(d)),
    zoom: {
      x: diagram.viewBox.offset.x,
      y: diagram.viewBox.offset.y,
      zoom: diagram.viewBox.zoomLevel
    },
    canvas: diagram.canvas
  };
};

export const serializeLayer = (layer: Layer): SerializedLayer => {
  if (layer.type === 'regular') {
    return {
      id: layer.id,
      name: layer.name,
      type: 'layer',
      layerType: 'regular',
      elements: (layer as RegularLayer).elements.map(serializeDiagramElement)
    };
  } else if (layer.type === 'reference') {
    return {
      id: layer.id,
      name: layer.name,
      type: 'layer',
      layerType: 'reference',
      layerId: (layer as ReferenceLayer).reference.layerId,
      diagramId: (layer as ReferenceLayer).reference.diagramId
    };
  } else if (layer.type === 'rule') {
    return {
      id: layer.id,
      name: layer.name,
      type: 'layer',
      layerType: 'rule',
      rules: (layer as RuleLayer).rules
    };
  } else {
    throw new NotImplementedYet();
  }
};

export const serializeDiagramElement = (element: DiagramElement): SerializedElement => {
  if (isNode(element)) {
    const node = element;
    return {
      id: node.id,
      type: 'node',
      nodeType: node.nodeType,
      bounds: node.bounds,
      anchors: node.anchors,
      children: node.children.map(serializeDiagramElement) as SerializedNode[],
      props: node.storedPropsCloned,
      metadata: node.metadataCloned,
      texts: node.textsCloned
    };
  } else if (isEdge(element)) {
    const edge = element;
    return {
      id: edge.id,
      type: 'edge',
      start: edge.start.serialize(),
      end: edge.end.serialize(),
      labelNodes: edge.labelNodes?.map(e => ({
        id: e.id,
        type: e.type,
        offset: e.offset,
        timeOffset: e.timeOffset
      })),
      waypoints: edge.waypoints,
      props: edge.storedPropsCloned,
      metadata: edge.metadataCloned,
      children: edge.children.map(serializeDiagramElement) as SerializedNode[]
    };
  } else {
    throw new VerifyNotReached();
  }
};
