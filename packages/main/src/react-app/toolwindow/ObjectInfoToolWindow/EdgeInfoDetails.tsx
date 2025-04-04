import { DiagramEdge } from '@diagram-craft/model/diagramEdge';
import { useRedraw } from '../../hooks/useRedraw';
import { useEventListener } from '../../hooks/useEventListener';
import { ObjectTreeNode } from './ObjectTreeNode';
import { Tree } from '@diagram-craft/app-components/Tree';
import { useDiagram } from '../../../application';

export const EdgeInfoDetails = (props: Props) => {
  const diagram = useDiagram();
  const redraw = useRedraw();
  useEventListener(diagram, 'elementChange', redraw);

  if (!props.obj) return null;
  return (
    <Tree.Root>
      <Tree.Node>
        <Tree.NodeLabel>id</Tree.NodeLabel>
        <Tree.NodeCell>{props.obj.id}</Tree.NodeCell>
      </Tree.Node>
      <Tree.Node isOpen={true}>
        <Tree.NodeLabel>startPosition</Tree.NodeLabel>
        <Tree.Children>
          <ObjectTreeNode obj={props.obj.start.position} />
        </Tree.Children>
      </Tree.Node>
      <Tree.Node isOpen={true}>
        <Tree.NodeLabel>endPosition</Tree.NodeLabel>
        <Tree.Children>
          <ObjectTreeNode obj={props.obj.end.position} />
        </Tree.Children>
      </Tree.Node>
      <Tree.Node isOpen={true}>
        <Tree.NodeLabel>bounds</Tree.NodeLabel>
        <Tree.Children>
          <ObjectTreeNode obj={props.obj.bounds} />
        </Tree.Children>
      </Tree.Node>
      <Tree.Node isOpen={true}>
        <Tree.NodeLabel>metadata</Tree.NodeLabel>
        <Tree.Children>
          <ObjectTreeNode obj={props.obj.metadata} />
        </Tree.Children>
      </Tree.Node>
      <Tree.Node isOpen={true}>
        <Tree.NodeLabel>props</Tree.NodeLabel>
        <Tree.Children>
          <ObjectTreeNode obj={props.obj.storedProps} />
        </Tree.Children>
      </Tree.Node>
    </Tree.Root>
  );
};

type Props = { obj: DiagramEdge };
