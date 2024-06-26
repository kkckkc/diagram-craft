import * as ReactToolbar from '@radix-ui/react-toolbar';
import React from 'react';
import { useEventListener } from '../hooks/useEventListener';
import { useRedraw } from '../hooks/useRedraw';
import { useActions } from '../context/ActionsContext';
import { ToggleAction } from '@diagram-craft/canvas/action';
import { ActionName } from '@diagram-craft/canvas/keyMap';

export const ActionToggleButton = (props: Props) => {
  const { actionMap } = useActions();
  const redraw = useRedraw();
  useEventListener(actionMap[props.action]!, 'actionchanged', redraw);

  return (
    <ReactToolbar.Button
      className="cmp-toolbar__button"
      data-state={(actionMap[props.action]! as ToggleAction).getState({}) ? 'on' : 'off'}
      value={props.action}
      aria-label={props.action}
      onClick={() => {
        actionMap[props.action]!.execute({});
      }}
    >
      {props.children}
    </ReactToolbar.Button>
  );
};

type Props = {
  action: ActionName;
  children: React.ReactNode;
};
