import { commitWithUndo } from '@diagram-craft/model/index';
import { AbstractSelectionAction } from './abstractSelectionAction';
import { Diagram } from '@diagram-craft/model/index';
import { UnitOfWork } from '@diagram-craft/model/index';
import { Box } from '@diagram-craft/geometry/index';
import { ActionMapFactory, State } from '@diagram-craft/canvas/keyMap';

declare global {
  interface ActionMap {
    DISTRIBUTE_VERTICAL: DistributeAction;
    DISTRIBUTE_HORIZONTAL: DistributeAction;
  }
}

export const distributeActions: ActionMapFactory = (state: State) => ({
  DISTRIBUTE_HORIZONTAL: new DistributeAction(state.diagram, 'horizontal'),
  DISTRIBUTE_VERTICAL: new DistributeAction(state.diagram, 'vertical')
});

const minBounds = (b: Box) => {
  return { x: Math.min(b.x, b.x + b.w), y: Math.min(b.y, b.y + b.h) };
};

const maxBounds = (b: Box) => {
  return { x: Math.max(b.x, b.x + b.w), y: Math.max(b.y, b.y + b.h) };
};

export class DistributeAction extends AbstractSelectionAction {
  constructor(
    protected readonly diagram: Diagram,
    private readonly mode: 'vertical' | 'horizontal'
  ) {
    super(diagram, true);
  }

  execute(): void {
    const uow = new UnitOfWork(this.diagram, true);

    const boundsOrientation = this.mode === 'vertical' ? 'y' : 'x';
    const boundsSize = this.mode === 'vertical' ? 'h' : 'w';

    this.calculateAndUpdateBounds(boundsOrientation, boundsSize, uow);

    commitWithUndo(uow, `Distribute ${this.mode}`);

    this.emit('actiontriggered', { action: this });
  }

  private calculateAndUpdateBounds(orientation: 'x' | 'y', size: 'w' | 'h', uow: UnitOfWork): void {
    const elementsInOrder = this.diagram.selectionState.elements.toSorted(
      (a, b) => minBounds(a.bounds)[orientation] - minBounds(b.bounds)[orientation]
    );

    const minimal = elementsInOrder[0];
    const min = minBounds(minimal.bounds)[orientation];
    const max = maxBounds(elementsInOrder.at(-1)!.bounds)[orientation];

    const totalSpace =
      max - min - this.diagram.selectionState.elements.reduce((p, c) => p + c.bounds[size], 0);

    const difference = totalSpace / (this.diagram.selectionState.elements.length - 1);

    let currentPosition = min + Math.abs(minimal.bounds[size] + difference);
    for (const e of elementsInOrder.slice(1)) {
      if (e.bounds[size] >= 0) {
        e.setBounds(
          orientation === 'y'
            ? { ...e.bounds, y: currentPosition }
            : { ...e.bounds, x: currentPosition },
          uow
        );
      } else {
        e.setBounds(
          orientation === 'y'
            ? { ...e.bounds, y: currentPosition - e.bounds[size] }
            : { ...e.bounds, x: currentPosition - e.bounds[size] },
          uow
        );
      }
      currentPosition += Math.abs(e.bounds[size] + difference);
    }
  }
}