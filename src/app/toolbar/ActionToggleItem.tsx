import * as ReactToolbar from '@radix-ui/react-toolbar';
import { useContext, useEffect } from 'react';
import { ActionToggleGroupContext } from './ActionToggleGroup.tsx';
import { ToggleAction } from '../../canvas/keyMap.ts';

export const ActionToggleItem = (props: Props) => {
  const actions = useContext(ActionToggleGroupContext);

  useEffect(() => {
    actions!.setActionState(props.action, (props.actionMap[props.action] as ToggleAction)?.state);
  }, [props.action, props.actionMap, actions]);

  return (
    <ReactToolbar.ToggleItem
      className="ToolbarToggleItem"
      value={props.action}
      aria-label={props.action}
    >
      {props.children}
    </ReactToolbar.ToggleItem>
  );
};

type Props = {
  actionMap: Partial<ActionMap>;
  action: keyof ActionMap;
  children: React.ReactNode;
};
