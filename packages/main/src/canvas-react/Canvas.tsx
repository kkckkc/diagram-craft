import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { CanvasComponent, Props } from '../canvas/Canvas.ts';

export const Canvas = forwardRef<SVGSVGElement, Props>((props, _ref) => {
  const diagram = props.diagram;
  const svgRef = useRef<SVGSVGElement | null>(null);

  const ref = useRef<HTMLDivElement>(null);
  const cmpRef = useRef<CanvasComponent>(new CanvasComponent());

  const cmpProps: Props = {
    ...props,
    diagram
  };

  if (ref.current) {
    cmpRef.current.update(cmpProps);
  }

  useImperativeHandle(_ref, () => svgRef.current!, [svgRef.current]);

  useEffect(() => {
    if (cmpRef.current.isRendered()) return;
    cmpRef.current.attach(ref.current!, cmpProps);
    svgRef.current = cmpRef.current.getSvgElement();
  });

  return <div ref={ref}></div>;
});