import { additionalHues, primaryColors } from './palette.ts';
import { ColorPicker } from '../ColorPicker.tsx';
import { EditableDiagram } from '../../model-editor/editable-diagram.ts';
import { useNodeProperty } from './useProperty.ts';
import * as ReactToolbar from '@radix-ui/react-toolbar';
import { TbAdjustmentsHorizontal, TbX } from 'react-icons/tb';
import * as Popover from '@radix-ui/react-popover';
import React from 'react';
import { ToolWindowPanel } from '../components/ToolWindowPanel.tsx';

export const NodeFillPanel = (props: Props) => {
  const [fill, setFill] = useNodeProperty('fill.color', props.diagram, 'transparent');
  const [color2, setColor2] = useNodeProperty('fill.color2', props.diagram, 'transparent');
  const [type, setType] = useNodeProperty('fill.type', props.diagram, 'solid');
  const [open, setOpen] = React.useState(false);

  return (
    <ToolWindowPanel mode={props.mode ?? 'accordion'} id="fill" title={'Fill'} hasCheckbox={false}>
      <div className={'cmp-labeled-table'}>
        <div className={'cmp-labeled-table__label'}>Type:</div>
        <div className={'cmp-labeled-table__value'}>
          <ReactToolbar.Root className="cmp-toolbar" aria-label="Formatting options">
            <ReactToolbar.ToggleGroup type={'single'} value={type} onValueChange={setType}>
              <ReactToolbar.ToggleItem className="cmp-toolbar__toggle-item" value={'solid'}>
                Solid
              </ReactToolbar.ToggleItem>
              <ReactToolbar.ToggleItem className="cmp-toolbar__toggle-item" value={'gradient'}>
                Gradient
              </ReactToolbar.ToggleItem>
              <ReactToolbar.ToggleItem className="cmp-toolbar__toggle-item" value={'pattern'}>
                Pattern
              </ReactToolbar.ToggleItem>
            </ReactToolbar.ToggleGroup>
          </ReactToolbar.Root>
        </div>

        <div className={'cmp-labeled-table__label'}>Color:</div>
        <div className={'cmp-labeled-table__value'}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ColorPicker
              primaryColors={primaryColors}
              additionalHues={additionalHues}
              color={fill ?? 'transparent'}
              onClick={setFill}
            />
            {type === 'gradient' && (
              <>
                &nbsp;
                <ColorPicker
                  primaryColors={primaryColors}
                  additionalHues={additionalHues}
                  color={color2 ?? 'transparent'}
                  onClick={setColor2}
                />
                &nbsp;
                <div className={'cmp-more'}>
                  <Popover.Root open={open} onOpenChange={o => setOpen(o)}>
                    <Popover.Trigger asChild>
                      <button>
                        <TbAdjustmentsHorizontal />
                      </button>
                    </Popover.Trigger>
                    <Popover.Portal>
                      <Popover.Content className="cmp-popover" sideOffset={5}>
                        <h2>Gradient</h2>

                        <Popover.Close className="cmp-popover__close" aria-label="Close">
                          <TbX />
                        </Popover.Close>
                        <Popover.Arrow className="cmp-popover__arrow" />
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </ToolWindowPanel>
  );
};

type Props = {
  diagram: EditableDiagram;
  mode?: 'accordion' | 'panel';
};
