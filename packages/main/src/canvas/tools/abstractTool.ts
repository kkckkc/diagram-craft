import { DeferedMouseAction, Tool } from './types.ts';
import { MutableRefObject, RefObject } from 'react';
import { Diagram } from '@diagram-craft/model';
import { ToolType } from '../ApplicationState.ts';
import { ApplicationTriggers } from '../EditableCanvas.ts';
import { Point } from '@diagram-craft/geometry';
import { DragDopManager, Modifiers } from '../drag/dragDropManager.ts';

export abstract class AbstractTool implements Tool {
  currentElement: string | undefined;

  // TODO: Remove use of refs in here
  protected constructor(
    public readonly type: ToolType,
    protected readonly diagram: Diagram,
    protected readonly drag: DragDopManager,
    protected readonly svgRef: RefObject<SVGSVGElement>,
    protected readonly deferedMouseAction: MutableRefObject<DeferedMouseAction | undefined>,
    protected readonly applicationTriggers: ApplicationTriggers,
    protected readonly resetTool: () => void
  ) {}

  abstract onMouseDown(id: string, point: Point, modifiers: Modifiers): void;

  abstract onMouseUp(point: Point): void;

  abstract onMouseMove(point: Point, modifiers: Modifiers): void;

  onMouseOver(id: string, _point: Point): void {
    this.currentElement = id;
  }

  onMouseOut(_id: string, _point: Point): void {
    this.currentElement = undefined;
  }

  onKeyDown(_e: KeyboardEvent): void {
    // Do nothing
  }

  onKeyUp(_e: KeyboardEvent): void {
    // Do nothing
  }
}