import React from 'react';
import { assert } from '@diagram-craft/utils/assert';
import { Actions } from '@diagram-craft/canvas/keyMap';

export const ActionsContext = React.createContext<Actions | undefined>(undefined);

export const useActions = () => {
  const actions = React.useContext(ActionsContext);
  assert.present(actions);
  return actions;
};
