import * as Tree from '../../components/Tree';
import { SelectionState } from '@diagram-craft/model/selectionState';
import { ObjectTreeNode } from './ObjectTreeNode';

export const SelectionInfoDetails = (props: { obj: SelectionState }) => {
  return (
    <div style={{ margin: '-10px' }}>
      <Tree.Root>
        <Tree.Node>
          <Tree.NodeLabel>bounds</Tree.NodeLabel>
          <Tree.Children>
            <ObjectTreeNode obj={props.obj.bounds} />
          </Tree.Children>
        </Tree.Node>
      </Tree.Root>
    </div>
  );
};
