import { TbPaint } from 'react-icons/tb';
import { NodeFillPanel } from './NodeFillPanel';
import * as ReactToolbar from '@radix-ui/react-toolbar';
import { useDiagram } from '../../context/DiagramContext';
import { useNodeDefaults } from '../../hooks/useDefaults';
import { useNodeProperty } from '../../hooks/useProperty';
import { Popover } from '@diagram-craft/app-components/Popover';

// TODO: Make this disable if selection includes edges
export const NodeFillToolbarButton = () => {
  const diagram = useDiagram();
  const defaults = useNodeDefaults();

  const fill = useNodeProperty(diagram, 'fill.color', defaults.fill.color);

  const disabled = diagram.selectionState.nodes.every(n => !n.getDefinition().supports('fill'));

  return (
    <Popover.Root>
      <Popover.Trigger>
        <ReactToolbar.Button className="cmp-toolbar__button" disabled={disabled}>
          <TbPaint />
          <div
            style={{
              marginLeft: '5px',
              width: '30px',
              height: '12px',
              backgroundColor: disabled ? 'var(--slate-8)' : fill.val,
              marginRight: '3px',
              border: `1px solid ${disabled ? 'var(--slate-8)' : 'var(--primary-fg)'}`,
              borderRadius: '3px'
            }}
          ></div>
        </ReactToolbar.Button>
      </Popover.Trigger>
      <Popover.Content sideOffset={5}>
        <NodeFillPanel mode={'panel'} />
      </Popover.Content>
    </Popover.Root>
  );
};
