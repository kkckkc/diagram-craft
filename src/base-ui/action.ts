import { Point } from '../geometry/point.ts';
import { Emitter, EventEmitter } from '../utils/event.ts';

export type ActionEvents = {
  actionchanged: { action: Action };
  actiontriggered: { action: Action };
};

export type ActionContext = {
  point?: Point;
  id?: string;
};

export interface Action<T = unknown> extends Emitter<ActionEvents> {
  execute: (context: ActionContext, arg?: T) => void;
  isEnabled: (context: ActionContext) => boolean;
}

export abstract class AbstractAction<T = unknown>
  extends EventEmitter<ActionEvents>
  implements Action<T>
{
  protected enabled: boolean = true;

  isEnabled(_context: ActionContext): boolean {
    return this.enabled;
  }

  abstract execute(context: ActionContext, arg?: T): void;
}

export abstract class AbstractToggleAction<T = unknown>
  extends AbstractAction<T>
  implements ToggleAction<T>
{
  protected state: boolean = true;

  getState(_context: ActionContext): boolean {
    return this.state;
  }

  abstract execute(context: ActionContext, arg?: T): void;
}

export interface ToggleAction<T = unknown> extends Action<T> {
  getState: (context: ActionContext) => boolean;
}
