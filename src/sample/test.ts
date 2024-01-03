import { SerializedDiagramDocument } from '../model/serialization.ts';

export const testDiagram: SerializedDiagramDocument = {
  diagrams: [
    {
      id: 'doc1',
      name: 'Sheet 1',
      layers: [
        {
          id: 'layer1',
          name: 'Layer 1',
          type: 'layer',
          layerType: 'basic',
          elements: [
            {
              id: 'e1',
              type: 'edge',
              start: {
                anchor: 0,
                node: {
                  id: '3'
                },
                position: {
                  x: 420,
                  y: 70
                }
              },
              end: {
                anchor: 0,
                position: {
                  x: 325,
                  y: 255
                }
              },
              waypoints: [
                {
                  point: {
                    x: 360,
                    y: 200
                  },
                  controlPoints: [
                    {
                      x: 31,
                      y: 62.5
                    },
                    {
                      x: -31,
                      y: -62.5
                    }
                  ]
                }
              ],
              props: {
                arrow: {
                  start: {
                    type: 'SQUARE_ARROW_OUTLINE'
                  },
                  end: {
                    type: 'CROWS_FEET_BAR'
                  }
                },
                type: 'bezier'
              }
            },
            {
              id: 'e2',
              type: 'edge',
              start: {
                position: {
                  x: 20,
                  y: 20
                }
              },
              end: {
                position: {
                  x: 300,
                  y: 400
                }
              },
              waypoints: [],
              props: {}
            },
            {
              id: '3',
              type: 'node',
              nodeType: 'rounded-rect',
              bounds: {
                pos: {
                  x: 370,
                  y: 20
                },
                size: {
                  w: 100,
                  h: 100
                },
                rotation: 0
              },
              anchors: [
                {
                  point: {
                    x: 0.5,
                    y: 0.5
                  },
                  clip: true
                },
                {
                  point: {
                    x: 0.5,
                    y: 0
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.97,
                    y: 0.03
                  },
                  clip: false
                },
                {
                  point: {
                    x: 1,
                    y: 0.5
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.97,
                    y: 0.97
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.5,
                    y: 1
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.03,
                    y: 0.97
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0,
                    y: 0.5
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.03,
                    y: 0.03
                  },
                  clip: false
                }
              ],
              children: [],
              props: {
                text: {
                  text: ''
                }
              }
            }
          ]
        }
      ],
      diagrams: [
        {
          id: 'doc1.1',
          name: 'Sheet 1.1',
          layers: [
            {
              id: 'layer1',
              name: 'Layer 1',
              type: 'layer',
              layerType: 'basic',
              elements: [
                {
                  id: '2',
                  type: 'node',
                  nodeType: 'star',
                  bounds: {
                    pos: {
                      x: 400,
                      y: 270
                    },
                    size: {
                      w: 150,
                      h: 150
                    },
                    rotation: 0
                  },
                  anchors: [
                    {
                      point: {
                        x: 0.5,
                        y: 0.5
                      },
                      clip: true
                    },
                    {
                      point: {
                        x: 0.57,
                        y: 0.15
                      },
                      clip: false
                    },
                    {
                      point: {
                        x: 0.81,
                        y: 0.32
                      },
                      clip: false
                    },
                    {
                      point: {
                        x: 0.86,
                        y: 0.46
                      },
                      clip: false
                    },
                    {
                      point: {
                        x: 0.77,
                        y: 0.74
                      },
                      clip: false
                    },
                    {
                      point: {
                        x: 0.65,
                        y: 0.83
                      },
                      clip: false
                    },
                    {
                      point: {
                        x: 0.35,
                        y: 0.83
                      },
                      clip: false
                    },
                    {
                      point: {
                        x: 0.23,
                        y: 0.74
                      },
                      clip: false
                    },
                    {
                      point: {
                        x: 0.14,
                        y: 0.46
                      },
                      clip: false
                    },
                    {
                      point: {
                        x: 0.19,
                        y: 0.32
                      },
                      clip: false
                    },
                    {
                      point: {
                        x: 0.43,
                        y: 0.15
                      },
                      clip: false
                    }
                  ],
                  children: [],
                  props: {}
                }
              ]
            }
          ],
          diagrams: []
        }
      ]
    },
    {
      id: 'doc2',
      name: 'Sheet 2',
      layers: [
        {
          id: 'layer1',
          name: 'Layer 1',
          type: 'layer',
          layerType: 'basic',
          elements: [
            {
              id: '2',
              type: 'node',
              nodeType: 'star',
              bounds: {
                pos: {
                  x: 400,
                  y: 270
                },
                size: {
                  w: 150,
                  h: 150
                },
                rotation: 0
              },
              anchors: [
                {
                  point: {
                    x: 0.5,
                    y: 0.5
                  },
                  clip: true
                },
                {
                  point: {
                    x: 0.57,
                    y: 0.15
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.81,
                    y: 0.32
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.86,
                    y: 0.46
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.77,
                    y: 0.74
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.65,
                    y: 0.83
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.35,
                    y: 0.83
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.23,
                    y: 0.74
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.14,
                    y: 0.46
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.19,
                    y: 0.32
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.43,
                    y: 0.15
                  },
                  clip: false
                }
              ],
              children: [],
              props: {}
            }
          ]
        },
        {
          id: 'layer2',
          name: 'Layer 2',
          type: 'layer',
          layerType: 'basic',
          elements: [
            {
              id: '3',
              type: 'node',
              nodeType: 'rounded-rect',
              bounds: {
                pos: {
                  x: 370,
                  y: 20
                },
                size: {
                  w: 100,
                  h: 100
                },
                rotation: 0
              },
              anchors: [
                {
                  point: {
                    x: 0.5,
                    y: 0.5
                  },
                  clip: true
                },
                {
                  point: {
                    x: 0.5,
                    y: 0
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.97,
                    y: 0.03
                  },
                  clip: false
                },
                {
                  point: {
                    x: 1,
                    y: 0.5
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.97,
                    y: 0.97
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.5,
                    y: 1
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.03,
                    y: 0.97
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0,
                    y: 0.5
                  },
                  clip: false
                },
                {
                  point: {
                    x: 0.03,
                    y: 0.03
                  },
                  clip: false
                }
              ],
              children: [],
              props: {
                text: {
                  text: ''
                }
              }
            }
          ]
        }
      ],
      diagrams: []
    }
  ]
};
