import { SerializedDiagram } from '../model-viewer/serialization.ts';

export const snapTestDiagram: SerializedDiagram = {
  elements: [
    {
      type: 'edge',
      id: 'e1',
      start: { anchor: 'c', node: { id: '1_2' } },
      end: { anchor: 'c', node: { id: '2' } }
    },
    {
      type: 'node',
      nodeType: 'group',
      id: '1',
      bounds: {
        pos: { x: 50, y: 50 },
        size: { w: 100, h: 100 },
        rotation: 0
      },
      children: [
        {
          type: 'node',
          nodeType: 'rect',
          id: '1_1',
          bounds: {
            pos: { x: 10, y: 10 },
            size: { w: 20, h: 20 },
            rotation: 0
          },
          children: []
        },
        {
          type: 'node',
          nodeType: 'rect',
          id: '1_2',
          bounds: {
            pos: { x: 50, y: 50 },
            size: { w: 40, h: 40 },
            rotation: 0
          },
          children: []
        }
      ]
    },
    {
      type: 'node',
      nodeType: 'rect',
      id: '2',
      bounds: {
        pos: { x: 400, y: 270 },
        size: { w: 50, h: 50 },
        rotation: 0
      },
      children: []
    },
    {
      type: 'node',
      nodeType: 'rect',
      id: '3',
      bounds: {
        pos: { x: 370, y: 20 },
        size: { w: 100, h: 100 },
        rotation: 0
      },
      children: []
    },
    {
      type: 'node',
      nodeType: 'rect',
      id: '4',
      bounds: {
        pos: { x: 370, y: 185 },
        size: { w: 50, h: 20 },
        rotation: 0
      },
      children: []
    },
    {
      type: 'node',
      nodeType: 'rect',
      id: '010',
      bounds: {
        pos: { x: 110, y: 300 },
        size: { w: 20, h: 20 },
        rotation: 0
      },
      children: []
    },
    {
      type: 'node',
      nodeType: 'rect',
      id: '011',
      bounds: {
        pos: { x: 110, y: 340 },
        size: { w: 20, h: 20 },
        rotation: 0
      },
      children: []
    },
    {
      type: 'node',
      nodeType: 'rect',
      id: '012',
      bounds: {
        pos: { x: 110, y: 380 },
        size: { w: 20, h: 20 },
        rotation: 0
      },
      children: []
    },
    {
      type: 'node',
      nodeType: 'rect',
      id: '10',
      bounds: {
        pos: { x: 150, y: 300 },
        size: { w: 20, h: 20 },
        rotation: 0
      },
      children: []
    },
    {
      type: 'node',
      nodeType: 'rect',
      id: '11',
      bounds: {
        pos: { x: 190, y: 300 },
        size: { w: 20, h: 20 },
        rotation: 0
      },
      children: []
    },
    {
      type: 'node',
      nodeType: 'rect',
      id: '12',
      bounds: {
        pos: { x: 150, y: 340 },
        size: { w: 20, h: 20 },
        rotation: 0
      },
      children: []
    },
    {
      type: 'node',
      nodeType: 'rect',
      id: '13',
      bounds: {
        pos: { x: 190, y: 340 },
        size: { w: 20, h: 20 },
        rotation: 0
      },
      children: []
    },
    {
      type: 'node',
      nodeType: 'rect',
      id: '14',
      bounds: {
        pos: { x: 150, y: 380 },
        size: { w: 20, h: 20 },
        rotation: 0
      },
      children: []
    },
    {
      type: 'node',
      nodeType: 'rect',
      id: '15',
      bounds: {
        pos: { x: 190, y: 380 },
        size: { w: 20, h: 20 },
        rotation: 0
      },
      children: []
    }
  ]
};