import { nodeDefaults } from '@diagram-craft/model/diagramDefaults';
import { Editor, makeProperty } from './editors';
import { NodeActionPropertiesPanelForm } from '../../toolwindow/ObjectInfoToolWindow/NodeActionPropertiesPanel';

export const NodeActionPropertiesEditor: Editor = props => {
  const $p = props.props as NodeProps;

  const onChange = () => {
    props.onChange();
  };

  return (
    <NodeActionPropertiesPanelForm
      type={makeProperty($p, 'action.type', nodeDefaults, onChange)}
      url={makeProperty($p, 'action.url', nodeDefaults, onChange)}
    />
  );
};
