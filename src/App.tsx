import './App.css';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useCallback, useRef } from 'react';
import { Box, Coord } from './geometry.ts';
import { Node, NodeApi } from './Node.tsx';
import { Edge, EdgeApi } from './Edge.tsx';
import { Diagram, loadDiagram, NodeDef } from './diagram.ts';
import { Selection, SelectionApi } from './Selection.tsx';
import { SelectionState } from './state.ts';

type Drag = Coord;

const BACKGROUND = 'background';

type ObjectId = typeof BACKGROUND | string;

type DeferedMouseAction = {
  id: ObjectId;
  add?: boolean;
};

const diagram: Diagram = {
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
      pos: { x: 50, y: 50 },
      size: { w: 100, h: 100 },
      children: [
        {
          type: 'node',
          nodeType: 'rect',
          id: '1_1',
          pos: { x: 10, y: 10 },
          size: { w: 20, h: 20 },
          children: []
        },
        {
          type: 'node',
          nodeType: 'rect',
          id: '1_2',
          pos: { x: 50, y: 50 },
          size: { w: 40, h: 40 },
          children: []
        }
      ]
    },
    {
      type: 'node',
      nodeType: 'rect',
      id: '2',
      pos: { x: 250, y: 220 },
      size: { w: 100, h: 100 },
      children: []
    },
    {
      type: 'node',
      nodeType: 'rect',
      id: '3',
      pos: { x: 370, y: 20 },
      size: { w: 100, h: 100 },
      children: []
    }
  ]
};

const { nodeLookup, edgeLookup } = loadDiagram(diagram);

const App = () => {
  const selection = useRef<SelectionState>(SelectionState.EMPTY());
  const drag = useRef<Drag | undefined>(undefined);
  const nodeRefs = useRef<Record<string, NodeApi | null>>({});
  const edgeRefs = useRef<Record<string, EdgeApi | null>>({});
  const selectionRef = useRef<SelectionApi | null>(null);
  const deferedMouseAction = useRef<DeferedMouseAction | null>(null);

  const onMouseDown = useCallback((id: ObjectId, coord: Coord, add: boolean) => {
    const isClickOnBackground = id === BACKGROUND;
    try {
      if (add) {
        if (!isClickOnBackground) {
          selection.current = SelectionState.toggle(selection.current, nodeLookup[id]);
        }
      } else {
        if (Box.contains(selection.current, coord)) {
          deferedMouseAction.current = { id };
        } else {
          if (isClickOnBackground) {
            selection.current = SelectionState.clear(selection.current);
          } else {
            selection.current = SelectionState.set(selection.current, nodeLookup[id]);
          }
        }
      }

      if (SelectionState.isEmpty(selection.current)) return;

      const localCoord = Coord.subtract(coord, selection.current.pos);
      drag.current = { ...localCoord };
    } finally {
      selectionRef.current?.repaint();
    }
  }, []);

  const onMouseUp = useCallback((_id: ObjectId, _coord: Coord) => {
    try {
      drag.current = undefined;

      if (deferedMouseAction.current) {
        if (deferedMouseAction.current.id === BACKGROUND) {
          selection.current = SelectionState.clear(selection.current);
          return;
        } else {
          selection.current = SelectionState.set(
            selection.current,
            nodeLookup[deferedMouseAction.current.id]
          );
          return;
        }
      }

      selection.current = SelectionState.recalculate(selection.current);
    } finally {
      selectionRef.current?.repaint();
      deferedMouseAction.current = null;
    }
  }, []);

  const onMouseMove = useCallback((coord: Coord) => {
    if (drag.current === undefined) return;
    if (SelectionState.isEmpty(selection.current)) throw new Error('invalid state');

    deferedMouseAction.current = null;

    const d = Coord.subtract(coord, Coord.add(selection.current.pos, drag.current));

    for (const node of selection.current.elements) {
      NodeDef.move(node, Coord.add(node.world, d));

      SelectionState.recalculate(selection.current);

      nodeRefs.current[node.id]?.repaint();

      for (const edge of NodeDef.edges(node)) {
        edgeRefs.current[edge.id]?.repaint();
      }
    }

    selectionRef.current?.repaint();
  }, []);

  return (
    <>
      <DndProvider backend={HTML5Backend}>
        <div>
          <svg
            width="640px"
            height="480px"
            style={{ border: '1px solid white', background: 'white' }}
            onMouseDown={e => onMouseDown(BACKGROUND, Coord.fromEvent(e.nativeEvent), e.shiftKey)}
            onMouseUp={e => onMouseUp(BACKGROUND, Coord.fromEvent(e.nativeEvent))}
            onMouseMove={e => onMouseMove(Coord.fromEvent(e.nativeEvent))}
          >
            {diagram.elements.map(e => {
              const id = e.id;
              if (e.type === 'edge') {
                const edge = edgeLookup[id]!;
                return (
                  <Edge
                    key={id}
                    ref={(element: EdgeApi) => (edgeRefs.current[id] = element)}
                    def={edge}
                  />
                );
              } else {
                const node = nodeLookup[id]!;
                return (
                  <Node
                    key={id}
                    ref={(element: NodeApi) => (nodeRefs.current[id] = element)}
                    isSelected={!!selection.current?.elements?.includes(node)}
                    onMouseDown={onMouseDown}
                    def={node}
                  />
                );
              }
            })}

            <Selection ref={selectionRef} selection={selection.current} />
          </svg>
        </div>
      </DndProvider>
    </>
  );
};

export default App;
