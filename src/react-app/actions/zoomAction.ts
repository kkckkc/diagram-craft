import { Diagram } from '../../model/diagram.ts';
import { AbstractToggleAction } from '../../base-ui/action.ts';

declare global {
  interface ActionMap {
    ZOOM_IN: ZoomAction;
    ZOOM_OUT: ZoomAction;
  }
}

export class ZoomAction extends AbstractToggleAction {
  constructor(
    private readonly diagram: Diagram,
    private readonly direction: 'in' | 'out'
  ) {
    super();
  }

  execute(): void {
    if (this.direction === 'in') {
      this.diagram.viewBox.zoom(this.diagram.viewBox.midpoint, 1.1);
    } else {
      this.diagram.viewBox.zoom(this.diagram.viewBox.midpoint, 0.9);
    }
  }
}
