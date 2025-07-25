/* eslint-disable @typescript-eslint/no-explicit-any */
import { bench, describe } from 'vitest';
import {
  defaultEdgeRegistry,
  defaultNodeRegistry
} from '@diagram-craft/canvas-app/defaultRegistry';
import {
  makeDefaultDiagramFactory,
  makeDefaultDocumentFactory
} from '@diagram-craft/model/factory';
import { deserializeDiagramDocument } from '@diagram-craft/model/serialization/deserialize';
import shapes from '../../public/sample/shapes.json';
import arrows from '../../public/sample/arrows.json';
import { CollaborationConfig } from '@diagram-craft/model/collaboration/collaborationConfig';
import { NoOpCRDTMap, NoOpCRDTRoot } from '@diagram-craft/model/collaboration/noopCrdt';

const origRoot = CollaborationConfig.CRDTRoot;
const origMap = CollaborationConfig.CRDTMap;

const opts = { time: 2000 };

const nodeRegistry = defaultNodeRegistry();
const edgeRegistry = defaultEdgeRegistry();

const diagramFactory = makeDefaultDiagramFactory();
const documentFactory = makeDefaultDocumentFactory(nodeRegistry, edgeRegistry);

describe('loadSample', () => {
  bench(
    'loadShapes',
    async () => {
      const root = await documentFactory.loadCRDT(undefined, {} as any, () => {});
      const document = await documentFactory.createDocument(root, undefined, () => {});

      await deserializeDiagramDocument(shapes as any, document, diagramFactory);
    },
    {
      ...opts,
      setup: () => {
        CollaborationConfig.CRDTRoot = NoOpCRDTRoot;
        CollaborationConfig.CRDTMap = NoOpCRDTMap;
      },
      teardown: () => {
        CollaborationConfig.CRDTRoot = origRoot;
        CollaborationConfig.CRDTMap = origMap;
      }
    }
  );
  /*
  bench(
    'loadShapes YJS',
    async () => {
      const root = await documentFactory.loadCRDT(undefined, () => {});
      const document = await documentFactory.createDocument(root, undefined, () => {});

      await deserializeDiagramDocument(shapes as any, document, diagramFactory);
    },
    {
      ...opts,
      setup: () => {
        CollaborationConfig.CRDTRoot = YJSRoot;
        CollaborationConfig.CRDTMap = YJSMap;
      },
      teardown: () => {
        CollaborationConfig.CRDTRoot = origRoot;
        CollaborationConfig.CRDTMap = origMap;
      }
    }
  );
*/
  bench.skip(
    'loadArrows',
    async () => {
      const root = await documentFactory.loadCRDT(undefined, {} as any, () => {});
      const document = await documentFactory.createDocument(root, undefined, () => {});

      await deserializeDiagramDocument(arrows as any, document, diagramFactory);
    },
    {
      ...opts,
      setup: () => {
        CollaborationConfig.CRDTRoot = NoOpCRDTRoot;
        CollaborationConfig.CRDTMap = NoOpCRDTMap;
      },
      teardown: () => {
        CollaborationConfig.CRDTRoot = origRoot;
        CollaborationConfig.CRDTMap = origMap;
      }
    }
  );
  /*bench(
    'loadArrows [YJS]',
    async () => {
      const root = await documentFactory.loadCRDT(undefined, () => {});
      const document = await documentFactory.createDocument(root, undefined, () => {});

      await deserializeDiagramDocument(arrows as any, document, diagramFactory);
    },
    {
      ...opts,
      setup: () => {
        CollaborationConfig.CRDTRoot = YJSRoot;
        CollaborationConfig.CRDTMap = YJSMap;
      },
      teardown: () => {
        CollaborationConfig.CRDTRoot = origRoot;
        CollaborationConfig.CRDTMap = origMap;
      }
    }
  );*/
});
