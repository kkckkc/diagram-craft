import './initial-loader';

import ReactDOM from 'react-dom/client';
import { AppLoader, StencilRegistryConfig } from './AppLoader';
import './index.css';
import { deserializeDiagramDocument } from '@diagram-craft/model/serialization/deserialize';
import {
  defaultEdgeRegistry,
  defaultNodeRegistry
} from '@diagram-craft/canvas-app/defaultRegistry';
import { registerDrawioBaseNodeTypes } from '@diagram-craft/canvas-drawio/register';
import { fileLoaderRegistry, stencilLoaderRegistry } from '@diagram-craft/canvas-app/loaders';
import { DiagramRef } from './App';
import { Autosave } from './Autosave';
import { UserState } from './UserState';
import {
  makeDefaultDiagramFactory,
  makeDefaultDocumentFactory
} from '@diagram-craft/model/factory';

stencilLoaderRegistry.drawioManual = () =>
  import('@diagram-craft/canvas-drawio/drawioLoaders').then(m => m.stencilLoaderDrawioManual);

stencilLoaderRegistry.drawioXml = () =>
  import('@diagram-craft/canvas-drawio/drawioLoaders').then(m => m.stencilLoaderDrawioXml);

fileLoaderRegistry['.drawio'] = () =>
  import('@diagram-craft/canvas-drawio/drawioLoaders').then(m => m.fileLoaderDrawio);

fileLoaderRegistry['.json'] = async () => (content, doc, diagramFactory) =>
  deserializeDiagramDocument(JSON.parse(content), doc, diagramFactory);

const stencilRegistry: StencilRegistryConfig = [
  {
    type: 'drawioManual',
    shapes: /^(module|folder|providedRequiredInterface|requiredInterface|uml[A-Z][a-z]+)$/,
    opts: {
      callback: () =>
        import('@diagram-craft/canvas-drawio/shapes/uml/uml').then(m => m.registerUMLShapes)
    }
  },
  {
    type: 'drawioXml',
    opts: {
      name: 'GCP',
      url: '/stencils/gcp2.xml',
      foreground: '#3b8df1',
      background: '#3b8df1'
    }
  },
  {
    type: 'drawioXml',
    opts: {
      name: 'AWS',
      url: '/stencils/aws3.xml',
      foreground: '#ff9900',
      background: '#ff9900'
    }
  },
  {
    type: 'drawioXml',
    opts: {
      name: 'Azure',
      url: '/stencils/azure.xml',
      foreground: '#00abf0',
      background: '#00abf0'
    }
  },
  {
    type: 'drawioXml',
    opts: {
      name: 'Fluid Power',
      url: '/stencils/fluid_power.xml',
      foreground: 'var(--canvas-fg)',
      background: 'var(--canvas-fg)'
    }
  },
  {
    type: 'drawioXml',
    opts: {
      name: 'IBM',
      url: '/stencils/ibm.xml',
      foreground: 'var(--canvas-fg)',
      background: 'transparent'
    }
  },
  {
    type: 'drawioXml',
    opts: {
      name: 'Web Logos',
      url: '/stencils/weblogos.xml',
      foreground: 'blue',
      background: '#ffffff'
    }
  },
  {
    type: 'drawioXml',
    opts: {
      name: 'Web Icons',
      url: '/stencils/webicons.xml',
      foreground: 'blue',
      background: '#000000'
    }
  },
  {
    type: 'drawioXml',
    opts: {
      name: 'EIP',
      url: '/stencils/eip.xml',
      foreground: 'black',
      background: '#c0f5a9'
    }
  },
  {
    type: 'drawioXml',
    opts: {
      name: 'Arrows',
      url: '/stencils/arrows.xml',
      foreground: 'var(--canvas-fg)',
      background: 'var(--canvas-bg2)'
    }
  },
  {
    type: 'drawioXml',
    opts: {
      name: 'Basic',
      url: '/stencils/basic.xml',
      foreground: 'var(--canvas-fg)',
      background: 'var(--canvas-bg2)'
    }
  }
];

const nodeRegistry = defaultNodeRegistry();
for (let i = 0; i < stencilRegistry.length; i++) {
  const s = stencilRegistry[i];
  if (s.shapes) {
    nodeRegistry.preregister(s.shapes, s.type, s.opts);
  }
}
registerDrawioBaseNodeTypes(nodeRegistry);

const edgeRegistry = defaultEdgeRegistry();

const diagramFactory = makeDefaultDiagramFactory();
const documentFactory = makeDefaultDocumentFactory(nodeRegistry, edgeRegistry);

const diagrams: Array<DiagramRef> = [];

if (location.hash !== '') {
  const url = location.hash.slice(1);
  diagrams.unshift({ url });
  Autosave.clear();
} else {
  const userState = new UserState();
  if (userState.recentFiles.length > 0) {
    diagrams.unshift({ url: userState.recentFiles[0] });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppLoader
    stencils={stencilRegistry}
    diagram={diagrams[0]}
    diagramFactory={diagramFactory}
    documentFactory={documentFactory}
    nodeRegistry={nodeRegistry}
  />
);
