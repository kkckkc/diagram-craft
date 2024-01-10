import { ActionContextMenuItem } from './ActionContextMenuItem.tsx';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { ContextMenuTarget } from '../../App.tsx';

export const CanvasContextMenu = (props: Props) => {
  return (
    <>
      <ActionContextMenuItem
        action={'CLIPBOARD_PASTE'}
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        context={{ point: props.target.pos, id: (props.target as any)['id'] }}
      >
        Paste
      </ActionContextMenuItem>
      <ContextMenu.Separator className="cmp-context-menu__separator" />
      <ActionContextMenuItem action={'UNDO'}>Undo</ActionContextMenuItem>
      <ActionContextMenuItem action={'REDO'}>Redo</ActionContextMenuItem>
      <ContextMenu.Separator className="cmp-context-menu__separator" />
      <ActionContextMenuItem action={'SELECT_ALL'}>Select All</ActionContextMenuItem>
      <ActionContextMenuItem action={'SELECT_ALL_NODES'}>Select Nodes</ActionContextMenuItem>
      <ActionContextMenuItem action={'SELECT_ALL_EDGES'}>Select Edges</ActionContextMenuItem>
    </>
  );
};

type Props = {
  target: ContextMenuTarget;
};
