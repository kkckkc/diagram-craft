import { Point } from '@diagram-craft/geometry/point';

export interface ApplicationTriggers extends Extensions.ApplicationTriggers {
  showContextMenu?: <T extends keyof ApplicationTriggers.ContextMenus>(
    type: T,
    point: Point,
    mouseEvent: MouseEvent,
    args: ApplicationTriggers.ContextMenus[T]
  ) => void;

  showNodeLinkPopup?: (point: Point, sourceNodeId: string, edgeId: string) => void;

  showMessageDialog?: (
    title: string,
    message: string,
    okLabel: string,
    cancelLabel: string,
    onClick: () => void
  ) => void;
  showDialog?: (state: ApplicationTriggers.DialogState) => void;

  setHelp?: (message: string) => void;
  pushHelp?: (id: string, message: string) => void;
  popHelp?: (id: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ApplicationTriggers {
  export interface ContextMenus extends Extensions.ContextMenus {
    canvas: object;
    selection: object;
    edge: { id: string };
    node: { id: string };
  }

  export type DialogState = {
    name: string;
    onOk: (data: unknown) => void;
    onCancel: () => void;
  };
}

export type ContextMenuTarget<
  T extends keyof ApplicationTriggers.ContextMenus = keyof ApplicationTriggers.ContextMenus
> = ApplicationTriggers.ContextMenus[T] & {
  pos: Point;
} & {
  type: T;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Extensions {
    interface ContextMenus {}

    interface ApplicationTriggers {}
  }
}