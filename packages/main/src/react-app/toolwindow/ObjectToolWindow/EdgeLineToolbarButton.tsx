import { EdgeLinePanel } from './EdgeLinePanel';
import { ArrowPreview } from './components/ArrowPreview';
import { ARROW_SHAPES } from '@diagram-craft/canvas/arrowShapes';
import { useEdgeProperty } from '../../hooks/useProperty';
import { Popover } from '@diagram-craft/app-components/Popover';
import { Toolbar } from '@diagram-craft/app-components/Toolbar';
import { useDiagram } from '../../../application';

export const EdgeLineToolbarButton = () => {
  const diagram = useDiagram();
  const strokeColor = useEdgeProperty(diagram, 'stroke.color');
  const fillColor = useEdgeProperty(diagram, 'fill.color', strokeColor.val);
  const arrowStart = useEdgeProperty(diagram, 'arrow.start.type');
  const arrowEnd = useEdgeProperty(diagram, 'arrow.end.type');

  return (
    <Popover.Root>
      <Popover.Trigger>
        <Toolbar.Button>
          <div
            style={{
              marginLeft: '5px',
              width: '75px',
              height: '12px',
              backgroundColor: 'var(--canvas-bg)',
              marginRight: '3px',
              paddingTop: '2px',
              border: '1px solid var(--tertiary-fg)',
              borderRadius: '3px'
            }}
          >
            <ArrowPreview
              fg={fillColor.val}
              bg={'var(--canvas-bg)'}
              color={strokeColor.val}
              width={65}
              type={arrowStart.val}
              start={ARROW_SHAPES[arrowStart.val]?.(0.75, 1)}
              end={ARROW_SHAPES[arrowEnd.val]?.(0.75, 1)}
            />
          </div>
        </Toolbar.Button>
      </Popover.Trigger>
      <Popover.Content sideOffset={5}>
        <EdgeLinePanel mode={'panel'} />
      </Popover.Content>
    </Popover.Root>
  );
};
