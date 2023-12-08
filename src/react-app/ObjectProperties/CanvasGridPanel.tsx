import { EditableDiagram } from '../../model-editor/editable-diagram.ts';
import { useRedraw } from '../../react-canvas-viewer/useRedraw.tsx';
import { useEventListener } from '../hooks/useEventListener.ts';
import { additionalHues, primaryColors } from './palette.ts';
import { ColorPicker } from '../ColorPicker.tsx';
import { useDiagramProperty } from './useProperty.ts';
import * as ReactToolbar from '@radix-ui/react-toolbar';
import { TbGrid3X3, TbGridDots } from 'react-icons/tb';
import { KeyMap } from '../../base-ui/keyMap.ts';
import { NumberInput } from '../NumberInput.tsx';
import { ToolWindowPanel } from '../components/ToolWindowPanel.tsx';

export const CanvasGridPanel = (props: Props) => {
  const redraw = useRedraw();

  useEventListener('canvaschanged', redraw, props.diagram);

  const [size, setSize] = useDiagramProperty('grid.size', props.diagram, 10);
  const [majorCount, setMajorCount] = useDiagramProperty('grid.majorCount', props.diagram, 5);
  const [color, setColor] = useDiagramProperty('grid.color', props.diagram, '#f5f5f4');
  const [majorColor, setMajorColor] = useDiagramProperty(
    'grid.majorColor',
    props.diagram,
    '#e7e5e4'
  );
  const [type, setType] = useDiagramProperty('grid.type', props.diagram, 'lines');
  const [majorType, setMajorType] = useDiagramProperty('grid.majorType', props.diagram, 'lines');
  const [enabled, setEnabled] = useDiagramProperty('grid.enabled', props.diagram, true);

  return (
    <ToolWindowPanel
      mode={props.mode ?? 'accordion'}
      title={'Grid'}
      hasCheckbox={true}
      value={enabled}
      onChange={setEnabled}
      id={'grid'}
    >
      <div className={'cmp-labeled-table'}>
        <div className={'cmp-labeled-table__label'}>Base</div>
        <div className={'cmp-labeled-table__value util-vcenter'}>
          <ColorPicker
            primaryColors={primaryColors}
            additionalHues={additionalHues}
            color={color ?? 'transparent'}
            onClick={setColor}
          />
          &nbsp;
          <NumberInput
            style={{ width: '45px' }}
            value={size ?? 10}
            onChange={setSize}
            validUnits={['px']}
            defaultUnit={'px'}
          />
          &nbsp;
          <ReactToolbar.Root className="cmp-toolbar" aria-label="Grid type">
            <ReactToolbar.ToggleGroup type={'single'} value={type} onValueChange={setType}>
              <ReactToolbar.ToggleItem className="cmp-toolbar__toggle-item" value={'lines'}>
                <TbGrid3X3 />
              </ReactToolbar.ToggleItem>
              <ReactToolbar.ToggleItem className="cmp-toolbar__toggle-item" value={'dots'}>
                <TbGridDots />
              </ReactToolbar.ToggleItem>
            </ReactToolbar.ToggleGroup>
          </ReactToolbar.Root>
        </div>

        <div className={'cmp-labeled-table__label'}>Major</div>
        <div className={'cmp-labeled-table__value util-vcenter'}>
          <ColorPicker
            primaryColors={primaryColors}
            additionalHues={additionalHues}
            color={majorColor ?? 'transparent'}
            onClick={setMajorColor}
          />
          &nbsp;
          <NumberInput style={{ width: '45px' }} value={majorCount ?? 5} onChange={setMajorCount} />
          &nbsp;
          <ReactToolbar.Root className="cmp-toolbar" aria-label="Grid type">
            <ReactToolbar.ToggleGroup
              type={'single'}
              value={majorType}
              onValueChange={setMajorType}
            >
              <ReactToolbar.ToggleItem className="cmp-toolbar__toggle-item" value={'lines'}>
                <TbGrid3X3 />
              </ReactToolbar.ToggleItem>
              <ReactToolbar.ToggleItem className="cmp-toolbar__toggle-item" value={'dots'}>
                <TbGridDots />
              </ReactToolbar.ToggleItem>
            </ReactToolbar.ToggleGroup>
          </ReactToolbar.Root>
        </div>
      </div>
    </ToolWindowPanel>
  );
};

type Props = {
  actionMap: Partial<ActionMap>;
  keyMap: KeyMap;
  diagram: EditableDiagram;
  mode?: 'accordion' | 'panel';
};
