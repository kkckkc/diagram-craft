import { Data, DataProvider } from './dataProvider';
import { DataSchema, DiagramDocumentDataSchemas } from './diagramDocumentDataSchemas';
import { DiagramDocument } from './diagramDocument';
import { DiagramDocumentDataTemplates } from './diagramDocumentDataTemplates';
import { UnitOfWork } from './unitOfWork';
import { deepEquals } from '@diagram-craft/utils/object';
import { EventEmitter } from '@diagram-craft/utils/event';

const makeDataListener =
  (document: DiagramDocument, mode: 'update' | 'delete') => (data: { data: Data[] }) => {
    for (const d of document.diagramIterator({ nest: true })) {
      const uow = new UnitOfWork(d);
      for (const e of d.allElements()) {
        const externalData = e.metadata.data?.data?.filter(d => d.type === 'external') ?? [];
        if (externalData.length === 0) continue;

        for (const dt of data.data) {
          const predicate = (e: ElementDataEntry) => e.external?.uid === dt._uid;

          const existing = externalData.find(predicate);
          if (!existing) continue;

          if (mode === 'update') {
            if (deepEquals<unknown>(existing, dt)) continue;

            e.updateMetadata(cb => {
              cb.data!.data!.find(predicate)!.data = dt;
            }, uow);
          } else {
            e.updateMetadata(cb => {
              cb.data ??= {};
              cb.data!.data = cb.data?.data?.filter(dt => !predicate(dt));
            }, uow);
          }
        }
      }
      uow.commit();
    }
  };

const makeDeleteSchemaListener = (document: DiagramDocument) => (s: DataSchema) => {
  document.data.schemas.removeAndClearUsage(s, UnitOfWork.immediate(document.topLevelDiagrams[0]));
};

const makeUpdateSchemaListener = (document: DiagramDocument) => (s: DataSchema) => {
  const schemas = document.data.schemas;
  if (schemas.has(s.id)) {
    if (deepEquals(schemas.get(s.id), s)) return;
    schemas.update(s);
  } else {
    schemas.add(s);
  }
};

// TODO: To be loaded from file
const DEFAULT_SCHEMA: DataSchema[] = [
  {
    id: 'default',
    name: 'Default',
    source: 'document',
    fields: [
      {
        id: 'name',
        name: 'Name',
        type: 'text'
      },
      {
        id: 'notes',
        name: 'Notes',
        type: 'longtext'
      }
    ]
  }
];

export class DiagramDocumentData extends EventEmitter<{ change: void }> {
  #document: DiagramDocument;

  #provider: DataProvider | undefined;
  #schemas: DiagramDocumentDataSchemas;
  #templates: DiagramDocumentDataTemplates;

  #updateDataListener: (data: { data: Data[] }) => void;
  #deleteDataListener: (data: { data: Data[] }) => void;
  #deleteSchemaListener: (s: DataSchema) => void;
  #updateSchemaListener: (s: DataSchema) => void;

  constructor(document: DiagramDocument) {
    super();
    this.#document = document;

    this.#schemas = new DiagramDocumentDataSchemas(this.#document, DEFAULT_SCHEMA);
    this.#templates = new DiagramDocumentDataTemplates();

    this.#updateDataListener = makeDataListener(document, 'update');
    this.#deleteDataListener = makeDataListener(document, 'delete');
    this.#deleteSchemaListener = makeDeleteSchemaListener(document);
    this.#updateSchemaListener = makeUpdateSchemaListener(document);

    this.#schemas.on('add', () => this.emit('change'));
    this.#schemas.on('remove', () => this.emit('change'));
    this.#schemas.on('update', () => this.emit('change'));
    this.#templates.on('add', () => this.emit('change'));
    this.#templates.on('remove', () => this.emit('change'));
    this.#templates.on('update', () => this.emit('change'));
  }

  get provider() {
    return this.#provider;
  }

  setProvider(dataProvider: DataProvider | undefined, initial = false) {
    this.#provider?.off?.('addData', this.#updateDataListener);
    this.#provider?.off?.('updateData', this.#updateDataListener);
    this.#provider?.off?.('deleteData', this.#deleteDataListener);
    this.#provider?.off?.('addSchema', this.#updateSchemaListener);
    this.#provider?.off?.('updateSchema', this.#updateSchemaListener);
    this.#provider?.off?.('deleteSchema', this.#deleteSchemaListener);

    this.#provider = dataProvider;
    if (!initial) this.emit('change');

    if (this.#provider) {
      this.#provider.on('addData', this.#updateDataListener);
      this.#provider.on('updateData', this.#updateDataListener);
      this.#provider.on('deleteData', this.#deleteDataListener);
      this.#provider.on('addSchema', this.#updateSchemaListener);
      this.#provider.on('updateSchema', this.#updateSchemaListener);
      this.#provider.on('deleteSchema', this.#deleteSchemaListener);
    }
  }

  get schemas() {
    return this.#schemas;
  }

  get templates() {
    return this.#templates;
  }
}
