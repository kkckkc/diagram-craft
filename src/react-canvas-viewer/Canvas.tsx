import { CSSProperties, forwardRef, SVGProps, useImperativeHandle, useRef } from 'react';
import { propsUtils } from './utils/propsUtils.ts';
import { Edge } from './Edge.tsx';
import { Node } from './Node.tsx';
import { useCanvasZoomAndPan } from './useCanvasZoomAndPan.ts';
import { Diagram } from '../model/diagram.ts';

export const Canvas = forwardRef<SVGSVGElement, Props>((props, ref) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const diagram = props.diagram;

  useImperativeHandle(ref, () => {
    return svgRef.current!;
  });

  useCanvasZoomAndPan(diagram, svgRef);

  const style: CSSProperties = {};

  if (diagram.props.background?.color) {
    style.backgroundColor = diagram.props.background.color;
  }

  // TODO: Maybe we should support updating based on diagram changes?
  // TODO: If we do, we can share quite a bit of code with the EditabledCanvas
  return (
    <svg
      ref={svgRef}
      {...propsUtils.filterDomProperties(props)}
      preserveAspectRatio="none"
      viewBox={diagram.viewBox.svgViewboxString}
      style={style}
    >
      {diagram.layers.visible.flatMap(layer => {
        return layer.elements.map(e => {
          const id = e.id;
          if (e.type === 'edge') {
            const edge = diagram.edgeLookup.get(id)!;
            return (
              <Edge
                key={id}
                onMouseDown={() => {}}
                onDoubleClick={() => {}}
                def={edge}
                diagram={diagram}
              />
            );
          } else {
            const node = diagram.nodeLookup.get(id)!;
            return <Node key={id} onMouseDown={() => {}} def={node} diagram={diagram} />;
          }
        });
      })}
    </svg>
  );
});

type Props = {
  // TODO: This should really by Diagram and not EditableDiagram
  diagram: Diagram;
} & Omit<
  SVGProps<SVGSVGElement>,
  'viewBox' | 'onMouseDown' | 'onMouseUp' | 'onMouseMove' | 'onContextMenu' | 'preserveAspectRatio'
>;
