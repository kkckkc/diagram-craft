import { DiagramPalette } from './diagramPalette';
import { DiagramStyles } from './diagramStyles';
import {
  Diagram,
  DiagramCRDT,
  diagramIterator,
  DiagramIteratorOpts,
  makeDiagramMapper
} from './diagram';
import { AttachmentConsumer, AttachmentManager } from './attachment';
import { EventEmitter } from '@diagram-craft/utils/event';
import { EdgeDefinitionRegistry, NodeDefinitionRegistry } from './elementDefinitionRegistry';
import { isNode } from './diagramElement';
import { UnitOfWork } from './unitOfWork';
import { DataProviderRegistry } from './dataProvider';
import { DefaultDataProvider, DefaultDataProviderId } from './dataProviderDefault';
import { UrlDataProvider, UrlDataProviderId } from './dataProviderUrl';
import { Generators } from '@diagram-craft/utils/generator';
import { SerializedElement } from './serialization/types';
import { DiagramDocumentData } from './diagramDocumentData';
import { CRDT, CRDTRoot } from './collaboration/crdt';
import { CollaborationConfig } from './collaboration/collaborationConfig';
import { DocumentProps } from './documentProps';
import { ProgressCallback } from './types';
import { MappedCRDTOrderedMap } from './collaboration/mappedCRDTOrderedMap';

export type DocumentEvents = {
  diagramchanged: { diagram: Diagram };
  diagramadded: { diagram: Diagram };
  diagramremoved: { diagram: Diagram };
};

export type DataTemplate = {
  id: string;
  schemaId: string;
  name: string;
  template: SerializedElement;
};

export class DiagramDocument extends EventEmitter<DocumentEvents> implements AttachmentConsumer {
  readonly root: CRDTRoot;

  readonly attachments: AttachmentManager;
  readonly styles: DiagramStyles;
  readonly customPalette: DiagramPalette;
  readonly props: DocumentProps;
  readonly #diagrams: MappedCRDTOrderedMap<Diagram, DiagramCRDT>;
  readonly data: DiagramDocumentData;

  // Transient properties
  url: string | undefined;

  constructor(
    public readonly nodeDefinitions: NodeDefinitionRegistry,
    public readonly edgeDefinitions: EdgeDefinitionRegistry,
    isStencil?: boolean,
    crdtRoot?: CRDTRoot
  ) {
    super();

    this.root = crdtRoot ?? CRDT.makeRoot();
    this.data = new DiagramDocumentData(this.root, this);
    this.customPalette = new DiagramPalette(this.root, isStencil ? 0 : 14);
    this.styles = new DiagramStyles(this.root, this, !isStencil);
    this.attachments = new AttachmentManager(this.root, this);
    this.props = new DocumentProps(this.root, this);

    this.#diagrams = new MappedCRDTOrderedMap(
      this.root.getMap('diagrams'),
      makeDiagramMapper(this),
      true
    );
  }

  transact(callback: () => void) {
    this.root.transact(callback);
  }

  activate(callback: ProgressCallback) {
    if (!this.url) return;
    CollaborationConfig.Backend.connect(this.url, this.root, callback);
  }

  deactivate(callback: ProgressCallback) {
    CollaborationConfig.Backend.disconnect(callback);
  }

  get topLevelDiagrams() {
    return this.#diagrams.values.filter(d => !d.parent);
  }

  get definitions() {
    return {
      nodeDefinitions: this.nodeDefinitions,
      edgeDefinitions: this.edgeDefinitions
    };
  }

  *diagramIterator(opts: DiagramIteratorOpts = {}) {
    yield* diagramIterator(this.#diagrams.values, opts);
  }

  getById(id: string) {
    return Generators.first(
      this.diagramIterator({
        nest: true,
        filter: (d: Diagram) => d.id === id,
        earlyExit: true
      })
    );
  }

  getDiagramPath(diagram: Diagram, startAt?: Diagram): Diagram[] {
    const dest: Diagram[] = [];

    for (const d of startAt ? startAt.diagrams : this.topLevelDiagrams) {
      if (d === diagram) {
        dest.push(d);
      } else {
        const p = this.getDiagramPath(diagram, d);
        if (p.length > 0) {
          dest.push(d);
          dest.push(...p);
        }
      }
    }

    return dest;
  }

  addDiagram(diagram: Diagram, parent?: Diagram) {
    // TODO: Re-enable this
    //    precondition.is.false(!!this.getById(diagram.id));

    diagram._parent = parent?.id;

    // TODO: This should be removed
    const existing = this.#diagrams.get(diagram.id);
    if (existing) {
      existing.merge(diagram);
    } else {
      this.#diagrams.add(diagram.id, diagram);
    }

    diagram.document = this;
    this.emit('diagramadded', { diagram: diagram });
  }

  removeDiagram(diagram: Diagram) {
    this.#diagrams.remove(diagram.id);
    this.emit('diagramremoved', { diagram: diagram });
  }

  changeDiagram(diagram: Diagram) {
    this.emit('diagramchanged', { diagram: diagram });
  }

  toJSON() {
    return {
      diagrams: this.#diagrams.values,
      styles: this.styles,
      props: this.props,
      customPalette: this.customPalette
    };
  }

  getAttachmentsInUse() {
    return [...this.diagramIterator({ nest: true }).flatMap(e => e.getAttachmentsInUse())];
  }

  // TODO: We should probably move this into the diagram loaders and/or deserialization
  //       This way, warnings as anchors are determined during deserialization are triggered
  async load() {
    const loadedTypes = new Set<string>();
    for (const diagram of this.diagramIterator({ nest: true })) {
      const uow = UnitOfWork.immediate(diagram);
      for (const element of diagram.allElements()) {
        if (isNode(element)) {
          const s = element.nodeType;
          if (!this.nodeDefinitions.hasRegistration(s)) {
            if (!(await this.nodeDefinitions.load(s))) {
              console.warn(`Node definition ${s} not loaded`);
            } else {
              element.invalidate(uow);
              loadedTypes.add(s);
            }
          } else if (loadedTypes.has(s)) {
            element.invalidate(uow);
          }
        }
      }
    }
  }
}

/*
 * Register default data providers
 */
DataProviderRegistry.register(DefaultDataProviderId, (s: string) => new DefaultDataProvider(s));
DataProviderRegistry.register(UrlDataProviderId, (s: string) => new UrlDataProvider(s));
