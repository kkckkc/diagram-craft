import { SerializedDiagramDocument } from '../model/serialization/types.ts';

export const snapTestDiagram: SerializedDiagramDocument = {
  diagrams: [
    {
      id: 'snaptest-doc1',
      name: 'Sheet 1',
      diagrams: [],
      layers: [
        {
          type: 'layer',
          id: 'layer1',
          name: 'Layer 1',
          layerType: 'basic',
          elements: [
            {
              type: 'edge',
              id: 'e1',
              start: { anchor: 0, node: { id: '1_2' } },
              end: { anchor: 0, node: { id: '2' } },
              props: {}
            },
            {
              type: 'node',
              nodeType: 'group',
              id: '1',
              bounds: {
                x: 50,
                y: 50,
                w: 100,
                h: 100,
                r: 0
              },
              children: [
                {
                  type: 'node',
                  nodeType: 'rect',
                  id: '1_1',
                  bounds: {
                    x: 0,
                    y: 0,
                    w: 70,
                    h: 80,
                    r: 0
                  },
                  children: [],
                  props: {}
                },
                {
                  type: 'node',
                  nodeType: 'rect',
                  id: '1_2',
                  bounds: {
                    x: 60,
                    y: 60,
                    w: 40,
                    h: 40,
                    r: 0
                  },
                  children: [],
                  props: {}
                }
              ],
              props: {}
            },
            {
              type: 'node',
              nodeType: 'rect',
              id: '2',
              bounds: {
                x: 400,
                y: 270,
                w: 50,
                h: 50,
                r: 0
              },
              children: [],
              props: {}
            },
            {
              type: 'node',
              nodeType: 'rect',
              id: '3',
              bounds: {
                x: 370,
                y: 20,
                w: 100,
                h: 100,
                r: 0
              },
              children: [],
              props: {}
            },
            {
              type: 'node',
              nodeType: 'rect',
              id: '4',
              bounds: {
                x: 370,
                y: 185,
                w: 50,
                h: 20,
                r: 0
              },
              children: [],
              props: {}
            },
            {
              type: 'node',
              nodeType: 'rect',
              id: '010',
              bounds: {
                x: 110,
                y: 300,
                w: 20,
                h: 2,
                r: 0
              },
              children: [],
              props: {}
            },
            {
              type: 'node',
              nodeType: 'rect',
              id: '011',
              bounds: {
                x: 110,
                y: 340,
                w: 20,
                h: 20,
                r: 0
              },
              children: [],
              props: {}
            },
            {
              type: 'node',
              nodeType: 'rect',
              id: '012',
              bounds: {
                x: 110,
                y: 380,
                w: 20,
                h: 20,
                r: 0
              },
              children: [],
              props: {}
            },
            {
              type: 'node',
              nodeType: 'rect',
              id: '10',
              bounds: {
                x: 150,
                y: 300,
                w: 20,
                h: 20,
                r: 0
              },
              children: [],
              props: {}
            },
            {
              type: 'node',
              nodeType: 'rect',
              id: '11',
              bounds: {
                x: 190,
                y: 300,
                w: 20,
                h: 20,
                r: 0
              },
              children: [],
              props: {}
            },
            {
              type: 'node',
              nodeType: 'rect',
              id: '12',
              bounds: {
                x: 150,
                y: 340,
                w: 20,
                h: 20,
                r: 0
              },
              children: [],
              props: {}
            },
            {
              type: 'node',
              nodeType: 'rect',
              id: '13',
              bounds: {
                x: 190,
                y: 340,
                w: 20,
                h: 20,
                r: 0
              },
              children: [],
              props: {}
            },
            {
              type: 'node',
              nodeType: 'rect',
              id: '14',
              bounds: {
                x: 150,
                y: 380,
                w: 20,
                h: 20,
                r: 0
              },
              children: [],
              props: {}
            },
            {
              type: 'node',
              nodeType: 'rect',
              id: '15',
              bounds: {
                x: 190,
                y: 380,
                w: 20,
                h: 20,
                r: 0
              },
              children: [],
              props: {}
            }
          ]
        }
      ]
    }
  ]
};
