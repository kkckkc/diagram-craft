import { DiagramElement } from './diagramElement';
import type { SelectionState } from './selectionState';
import { Box } from '@diagram-craft/geometry/box';
import { EventEmitter } from '@diagram-craft/utils/event';
import { precondition } from '@diagram-craft/utils/assert';

export type MarqueeEvents = {
  change: { marquee: Marquee };
};

export class Marquee extends EventEmitter<MarqueeEvents> {
  #bounds?: Box;

  pendingElements?: ReadonlyArray<DiagramElement>;

  constructor(private readonly selectionState: SelectionState) {
    super();
  }

  set bounds(bounds: Box | undefined) {
    this.#bounds = bounds;
    this.emitAsync('change', { marquee: this });
  }

  get bounds(): Box | undefined {
    return this.#bounds;
  }

  clear() {
    this.bounds = undefined;
    this.pendingElements = undefined;
  }

  commitSelection() {
    precondition.is.present(this.pendingElements);

    this.selectionState.setElements([
      ...this.pendingElements.filter(e => !this.selectionState.elements.includes(e)),
      ...this.selectionState.elements
    ]);

    this.clear();
  }
}
