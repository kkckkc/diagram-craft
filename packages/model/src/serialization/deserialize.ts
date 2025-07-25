import { Diagram } from '../diagram';
import { DiagramNode } from '../diagramNode';
import { DiagramEdge } from '../diagramEdge';
import { UnitOfWork } from '../unitOfWork';
import { isSerializedEndpointAnchor, isSerializedEndpointPointInNode } from './utils';
import { DiagramDocument } from '../diagramDocument';
import { VerifyNotReached } from '@diagram-craft/utils/assert';
import {
  SerializedAnchorEndpoint,
  SerializedDiagram,
  SerializedDiagramDocument,
  SerializedElement,
  SerializedFreeEndpoint,
  SerializedPointInNodeEndpoint,
  SerializedStylesheet
} from './types';
import { Endpoint } from '../endpoint';
import { DiagramStyles, Stylesheet } from '../diagramStyles';
import { DefaultStyles } from '../diagramDefaults';
import { ReferenceLayer } from '../diagramLayerReference';
import { RuleLayer } from '../diagramLayerRule';
import { DataProviderRegistry } from '../dataProvider';
import { RegularLayer } from '../diagramLayerRegular';
import type { DiagramFactory } from '../factory';

const unfoldGroup = (node: SerializedElement) => {
  const recurse = (
    nodes: ReadonlyArray<SerializedElement>,
    parent?: SerializedElement | undefined
  ): (SerializedElement & { parent?: SerializedElement | undefined })[] => {
    return [
      ...nodes.map(n => ({ ...n, parent })),
      ...nodes.flatMap(n => recurse(n.children ?? [], n))
    ];
  };

  if ((node.children ?? []).length > 0) {
    return [...recurse(node.children ?? [], node), { ...node }];
  } else {
    return [{ ...node }];
  }
};

const deserializeEndpoint = (
  e: SerializedAnchorEndpoint | SerializedPointInNodeEndpoint | SerializedFreeEndpoint,
  nodeLookup: Record<string, DiagramNode> | Map<string, DiagramNode>
) => {
  return Endpoint.deserialize(e, nodeLookup);
};

export const deserializeDiagramElements = (
  diagramElements: ReadonlyArray<SerializedElement>,
  diagram: Diagram,
  layer: RegularLayer,
  nodeLookup?: Map<string, DiagramNode>,
  edgeLookup?: Map<string, DiagramEdge>,
  uow?: UnitOfWork
) => {
  nodeLookup ??= new Map();
  edgeLookup ??= new Map();

  // Pass 1: create placeholders for all nodes
  for (const n of diagramElements) {
    for (const c of unfoldGroup(n)) {
      if (c.type !== 'node') continue;

      COMPATIBILITY: {
        // Note: this is for backwards compatibility only
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const textProps: any = c.props.text;
        if (textProps && textProps.text && (!c.texts || !c.texts.text)) {
          c.texts ??= { text: textProps.text };
          c.texts.text = textProps.text;
          delete textProps.text;
        }
      }

      nodeLookup.set(
        c.id,
        DiagramNode.create(
          c.id,
          c.nodeType,
          c.bounds,
          layer,
          c.props,
          {
            style: c.nodeType === 'text' ? DefaultStyles.node.text : DefaultStyles.node.default,
            ...c.metadata
          },
          c.texts,
          c.anchors
        )
      );
    }
  }

  // Pass 2: create placeholders for all edges
  for (const n of diagramElements) {
    for (const e of unfoldGroup(n)) {
      if (e.type !== 'edge') continue;

      const { start, end } = e;

      const startEndpoint = deserializeEndpoint(start, nodeLookup);
      const endEndpoint = deserializeEndpoint(end, nodeLookup);

      const edge = DiagramEdge.create(
        e.id,
        startEndpoint,
        endEndpoint,
        e.props,
        {
          style: 'default-edge',
          ...e.metadata
        },
        e.waypoints ?? [],
        layer
      );

      if (isSerializedEndpointAnchor(start)) {
        const startNode = nodeLookup.get(start.node.id)!;
        startNode._addEdge(start.anchor, edge);
      } else if (isSerializedEndpointPointInNode(start)) {
        const startNode = nodeLookup.get(start.node.id)!;
        startNode._addEdge(undefined, edge);
      }

      if (isSerializedEndpointAnchor(end)) {
        const endNode = nodeLookup.get(end.node.id)!;
        endNode._addEdge(end.anchor, edge);
      } else if (isSerializedEndpointPointInNode(end)) {
        const endNode = nodeLookup.get(end.node.id)!;
        endNode._addEdge(undefined, edge);
      }

      edgeLookup.set(e.id, edge);
    }
  }

  // Pass 3: resolve relations
  uow ??= new UnitOfWork(diagram, false, true);
  for (const n of diagramElements) {
    for (const c of unfoldGroup(n)) {
      const el = c.type === 'node' ? nodeLookup.get(c.id)! : edgeLookup.get(c.id)!;
      el.setChildren(c.children?.map(c2 => nodeLookup.get(c2.id)!) ?? [], uow);

      if (c.parent) {
        const resolvedParent = nodeLookup.get(c.parent.id) ?? edgeLookup.get(c.parent.id);
        el._setParent(resolvedParent);
      }
    }

    if (n.type === 'edge') {
      const edge = edgeLookup.get(n.id)!;
      if (n.labelNodes && n.labelNodes.length > 0) {
        edge.setLabelNodes(
          n.labelNodes.map(ln => ({ ...ln, node: () => nodeLookup.get(ln.id)! })),
          uow
        );
      }
    }
  }

  // Pass 4: gather all elements - only keep the top-level elements
  return diagramElements
    .map(n => (n.type === 'node' ? nodeLookup.get(n.id)! : edgeLookup.get(n.id)!))
    .filter(e => e.parent === undefined);
};

export const deserializeDiagramDocument = async <T extends Diagram>(
  document: SerializedDiagramDocument,
  doc: DiagramDocument,
  diagramFactory: DiagramFactory<T>
): Promise<void> => {
  const diagrams = document.diagrams;

  doc.root.transact(() => {
    if (document.customPalette) {
      doc.customPalette.setColors(document.customPalette);
    }

    if (document.styles) {
      for (const edgeStyle of document.styles.edgeStyles) {
        doc.styles.addStylesheet(edgeStyle.id, deserializeStylesheet(edgeStyle, doc.styles));
      }
      for (const nodeStyle of document.styles.nodeStyles) {
        doc.styles.addStylesheet(nodeStyle.id, deserializeStylesheet(nodeStyle, doc.styles));
      }
    }

    if (document.schemas) {
      for (const schema of document.schemas) {
        doc.data.schemas.add(schema);
      }
    }

    const dest = deserializeDiagrams(doc, diagrams, diagramFactory);
    dest.forEach(d => doc.addDiagram(d));

    if (document.data?.providerId) {
      const provider = DataProviderRegistry.get(document.data.providerId);
      if (provider) {
        doc.data.setProvider(provider(document.data.data!), true);
      } else {
        console.warn(`Provider ${document.data.providerId} not found`);
      }
    }

    doc.data.templates.replaceBy(document.data?.templates ?? []);

    if (document.props?.query?.saved) {
      doc.props.query.setSaved(document.props.query.saved);
    }
    if (document.props?.query?.history) {
      doc.props.query.setHistory(document.props.query.history);
    }
    if (document.props?.stencils) {
      doc.props.recentStencils.set(document.props?.stencils);
    }
  });

  if (document.attachments) {
    for (const val of Object.values(document.attachments)) {
      const buf = Uint8Array.from(atob(val), c => c.charCodeAt(0));
      await doc.attachments.addAttachment(new Blob([buf]));
    }
  }
};

const deserializeStylesheet = (s: SerializedStylesheet, styles: DiagramStyles) =>
  Stylesheet.fromSnapshot(s.type, s, styles.crdt.factory);

const deserializeDiagrams = <T extends Diagram>(
  doc: DiagramDocument,
  diagrams: ReadonlyArray<SerializedDiagram>,
  diagramFactory: DiagramFactory<T>
) => {
  const dest: T[] = [];
  for (const $d of diagrams) {
    const nodeLookup: Map<string, DiagramNode> = new Map();
    const edgeLookup: Map<string, DiagramEdge> = new Map();

    const newDiagram = diagramFactory($d, doc);
    newDiagram.canvas = $d.canvas;

    const uow = new UnitOfWork(newDiagram);
    for (const l of $d.layers) {
      if (l.layerType === 'regular' || l.layerType === 'basic') {
        const layer = new RegularLayer(l.id, l.name, [], newDiagram);
        newDiagram.layers.add(layer, UnitOfWork.immediate(newDiagram));

        const elements = deserializeDiagramElements(
          l.elements,
          newDiagram,
          layer,
          nodeLookup,
          edgeLookup
        );
        elements.forEach(e => {
          layer.addElement(e, uow);
        });

        layer.elements.forEach(e => e.invalidate(uow));
      } else if (l.layerType === 'reference') {
        const layer = new ReferenceLayer(l.id, l.name, newDiagram, {
          diagramId: l.diagramId,
          layerId: l.layerId
        });
        newDiagram.layers.add(layer, UnitOfWork.immediate(newDiagram));
      } else if (l.layerType === 'rule') {
        const layer = new RuleLayer(l.id, l.name, newDiagram, l.rules ?? []);
        newDiagram.layers.add(layer, UnitOfWork.immediate(newDiagram));
      } else {
        throw new VerifyNotReached();
      }
    }

    if ($d.activeLayerId) {
      const l = newDiagram.layers.byId($d.activeLayerId);
      if (l) {
        newDiagram.layers.active = l;
      }
    }

    if ($d.zoom) {
      newDiagram.viewBox.zoom($d.zoom.zoom);
      newDiagram.viewBox.pan({ x: $d.zoom.x, y: $d.zoom.y });
    }
    dest.push(newDiagram);
    uow.commit();

    deserializeDiagrams(doc, $d.diagrams, diagramFactory).forEach(d =>
      doc.addDiagram(d, newDiagram)
    );
  }

  return dest;
};
