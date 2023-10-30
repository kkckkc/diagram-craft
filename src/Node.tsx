import { Coord } from './geometry.ts';
import { forwardRef, MouseEventHandler, useCallback, useImperativeHandle, useState } from 'react';
import { ResolvedNodeDef } from './diagram.ts';

export type NodeApi = {
  repaint: () => void;
};

export const Node = forwardRef<NodeApi, Props>((props, ref) => {
  const [redraw, setRedraw] = useState(1);

  useImperativeHandle(ref, () => {
    return {
      repaint: () => {
        setRedraw(redraw + 1);
      }
    };
  });

  const wx = props.def.world.x;
  const wy = props.def.world.y;

  const onMouseDown = useCallback<MouseEventHandler>(
    e => {
      props.onMouseDown(props.def.id, Coord.fromEvent(e.nativeEvent), e.shiftKey);
      e.stopPropagation();

      return false;
    },
    [props]
  );

  if (props.def.nodeType === 'group') {
    return (
      <>
        {/* TODO: Probably remove the rect here? */}
        <rect
          x={wx}
          y={wy}
          width={props.def.size.w}
          height={props.def.size.h}
          fill="transparent"
          style={{ stroke: 'transparent' }}
          onMouseDown={onMouseDown}
        />
        {props.def.children.map(c => (
          <Node
            key={c.id}
            def={c}
            isSelected={false}
            onMouseDown={(_id, coord, add) => props.onMouseDown(props.def.id, coord, add)}
          />
        ))}
      </>
    );
  } else {
    return (
      <rect
        x={wx}
        y={wy}
        width={props.def.size.w}
        height={props.def.size.h}
        fill="#ffccff"
        style={{ stroke: 'black', strokeWidth: '1' }}
        rx="5"
        ry="5"
        onMouseDown={onMouseDown}
      />
    );
  }
});

type Props = {
  def: ResolvedNodeDef;
  onMouseDown: (id: string, coord: Coord, add: boolean) => void;
  isSelected: boolean;
};
