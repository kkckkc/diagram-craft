import * as ContextMenu from '@radix-ui/react-context-menu';
import React from 'react';
import { useActions } from '../context/ActionsContext';
import { Action, ActionContext } from '@diagram-craft/canvas/action';
import { findKeyBindings, formatKeyBinding } from '@diagram-craft/canvas/keyMap';

export const ActionContextMenuItem = (props: Props) => {
  const { actionMap, keyMap } = useActions();

  return (
    <ContextMenu.Item
      className="cmp-context-menu__item"
      disabled={!actionMap[props.action]?.isEnabled(props.context ?? {})}
      onSelect={async () => {
        const res = (await props.onBeforeSelect?.()) ?? true;
        if (res === false) return;

        const a: Action = actionMap[props.action]!;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        a.execute(props.context ?? {}, res as any);
      }}
    >
      {props.children}{' '}
      <div className="cmp-context-menu__right-slot">
        {formatKeyBinding(findKeyBindings(props.action, keyMap)[0])}
      </div>
    </ContextMenu.Item>
  );
};

type Props = {
  action: keyof ActionMap;
  context?: ActionContext;
  children: React.ReactNode;
  onBeforeSelect?: () => Promise<boolean | unknown>;
};
