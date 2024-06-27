import {
  deserializeDiagramDocument,
  DiagramFactory,
  DocumentFactory
} from '@diagram-craft/model/serialization/deserialize';
import { Diagram } from '@diagram-craft/model/diagram';
import { DiagramDocument } from '@diagram-craft/model/diagramDocument';
import { serializeDiagramDocument } from '@diagram-craft/model/serialization/serialize';

const KEY = 'autosave';

export const Autosave = {
  load: async (documentFactory: DocumentFactory, diagramFactory: DiagramFactory<Diagram>) => {
    const item = localStorage.getItem(KEY);
    if (!item) return undefined;

    const parsed = JSON.parse(item);

    return {
      url: parsed.url,
      diagram: await deserializeDiagramDocument(parsed.diagram, documentFactory, diagramFactory)
    };
  },

  clear: () => localStorage.removeItem(KEY),

  exists: () => !!localStorage.getItem(KEY),

  save: async (url: string, doc: DiagramDocument) => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        url,
        diagram: await serializeDiagramDocument(doc)
      })
    );
  }
};
