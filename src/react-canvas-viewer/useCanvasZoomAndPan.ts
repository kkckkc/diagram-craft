import { useDomEventListener, useEventListener } from '../react-app/hooks/useEventListener.ts';
import { ViewboxEvents } from '../model-viewer/viewBox.ts';
import { Point } from '../geometry/point.ts';
import { RefObject, useCallback, useEffect } from 'react';
import { Diagram } from '../model-viewer/diagram.ts';

export const useCanvasZoomAndPan = (diagram: Diagram, svgRef: RefObject<SVGSVGElement>) => {
  useEventListener(
    'viewbox',
    ({ viewbox }: ViewboxEvents['viewbox']) => {
      svgRef.current!.setAttribute('viewBox', viewbox.svgViewboxString);
    },
    diagram.viewBox
  );

  useDomEventListener(
    'wheel',
    e => {
      e.preventDefault();
      if (e.ctrlKey) {
        const delta = e.deltaY ?? e.detail ?? 0;
        const normalized = -(delta % 3 ? delta * 10 : delta / 3);
        diagram.viewBox.zoom(Point.fromEvent(e), normalized > 0 ? 1 / 1.008 : 1.008);
      } else {
        diagram.viewBox.pan({
          x: diagram.viewBox.offset.x + e.deltaX * 0.7,
          y: diagram.viewBox.offset.y + e.deltaY * 0.7
        });
      }
    },
    svgRef
  );

  const adjustViewbox = useCallback(() => {
    // TODO: Respect zoom level
    if (diagram.viewBox.zoomLevel === 1) {
      diagram.viewBox.pan({
        x: Math.floor(-(svgRef.current!.getBoundingClientRect().width - diagram.canvas.size.w) / 2),
        y: Math.floor(-(svgRef.current!.getBoundingClientRect().height - diagram.canvas.size.h) / 2)
      });
    }
    diagram.viewBox.dimensions = {
      w: Math.floor(svgRef.current!.getBoundingClientRect().width * diagram.viewBox.zoomLevel),
      h: Math.floor(svgRef.current!.getBoundingClientRect().height * diagram.viewBox.zoomLevel)
    };
    diagram.viewBox.windowSize = {
      w: Math.floor(svgRef.current!.getBoundingClientRect().width),
      h: Math.floor(svgRef.current!.getBoundingClientRect().height)
    };
  }, [diagram, svgRef]);

  useDomEventListener('resize', adjustViewbox, window);

  useEffect(() => {
    if (svgRef.current) adjustViewbox();
  }, [adjustViewbox, svgRef]);
};