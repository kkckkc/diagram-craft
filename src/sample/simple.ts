import { SerializedDiagram } from '../model-viewer/serialization.ts';

export const simpleDiagram: SerializedDiagram = {
  elements: [
    {
      type: 'edge',
      id: 'e1',
      start: { anchor: 0, node: { id: '3' } },
      end: { anchor: 0, node: { id: '4' } },
      props: {},
      waypoints: [{ point: { x: 360, y: 200 } }]
    },
    {
      type: 'edge',
      id: 'e2',
      start: { position: { x: 20, y: 20 } },
      end: { position: { x: 100, y: 100 } },
      props: {}
    },
    {
      type: 'node',
      nodeType: 'star',
      id: '2',
      bounds: {
        pos: { x: 400, y: 270 },
        size: { w: 150, h: 150 },
        rotation: 0
      },
      children: [],
      props: {}
    },

    {
      type: 'node',
      nodeType: 'rounded-rect',
      id: '3',
      bounds: {
        pos: { x: 370, y: 20 },
        size: { w: 100, h: 100 },
        rotation: 0
      },
      children: [],
      props: {
        text: {
          text: ''
        }
      }
    },

    {
      type: 'node',
      nodeType: 'rect',
      id: '4',
      bounds: {
        pos: { x: 300, y: 245 },
        size: { w: 50, h: 20 },
        rotation: 0
      },
      children: [],
      props: {}
    }
  ]
};
