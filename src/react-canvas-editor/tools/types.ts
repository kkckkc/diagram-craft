import { Point } from '../../geometry/point.ts';
import { Modifiers } from '../../base-ui/drag.ts';
import { EditableDiagram } from '../../model-editor/editable-diagram.ts';
import { DragDropContextType } from '../../react-canvas-viewer/DragDropManager.tsx';
import { MutableRefObject, RefObject } from 'react';

export type ToolType = 'move' | 'text';

export interface Tool {
  onMouseDown(id: ObjectId, point: Point, modifiers: Modifiers): void;

  onMouseUp(point: Point): void;

  onMouseMove(point: Point, modifiers: Modifiers): void;
}

export type ToolContructor = {
  new (
    diagram: EditableDiagram,
    drag: DragDropContextType,
    svgRef: RefObject<SVGSVGElement>,
    deferedMouseAction: MutableRefObject<DeferedMouseAction | undefined>,
    resetTool: () => void
  ): Tool;
};

// TODO: Move this constant somewhere else
export const BACKGROUND = 'background';

export type ObjectId = typeof BACKGROUND | string;

// TODO: Potentially move this to a more general place
export type DeferedMouseAction = {
  callback: () => void;
};
