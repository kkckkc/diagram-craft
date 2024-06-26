import * as ReactToolbar from '@radix-ui/react-toolbar';
import React, { useContext, useEffect } from 'react';
import { ActionToggleGroupContext } from './ActionToggleGroup';
import { useEventListener } from '../hooks/useEventListener';
import { useActions } from '../context/ActionsContext';
import { ToggleAction } from '@diagram-craft/canvas/action';
import { ActionName } from '@diagram-craft/canvas/keyMap';

export const ActionToggleItem = (props: Props) => {
  const { actionMap } = useActions();
  const actions = useContext(ActionToggleGroupContext);

  useEffect(() => {
    actions!.setActionState(props.action, (actionMap[props.action] as ToggleAction).getState({}));
  }, [props.action, actionMap, actions]);

  useEventListener(actionMap[props.action]!, 'actionchanged', ({ action }) => {
    actions!.setActionState(props.action, (action as ToggleAction).getState({}));
  });

  return (
    <ReactToolbar.ToggleItem
      className="cmp-toolbar__toggle-item"
      value={props.action}
      aria-label={props.action}
    >
      {props.children}
    </ReactToolbar.ToggleItem>
  );
};

type Props = {
  action: ActionName;
  children: React.ReactNode;
};
