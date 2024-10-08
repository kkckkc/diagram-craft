import { Box } from '@diagram-craft/geometry/box';
import { round } from '@diagram-craft/utils/math';
import { useConfiguration } from '../../context/ConfigurationContext';
import { useRedraw } from '../../hooks/useRedraw';
import { useEventListener } from '../../hooks/useEventListener';
import { useDiagramProperty } from '../../hooks/useProperty';
import { ToolWindowPanel } from '../ToolWindowPanel';
import { ColorPicker } from '../../components/ColorPicker';
import { NumberInput } from '@diagram-craft/app-components/NumberInput';
import { useDiagram } from '../../../application';

export const CanvasPanel = (props: Props) => {
  const $cfg = useConfiguration();
  const redraw = useRedraw();
  const diagram = useDiagram();

  useEventListener(diagram, 'change', redraw);
  const bg = useDiagramProperty(diagram, 'background.color', 'white');

  const bounds = { ...diagram.canvas, r: 0 };

  const updateBounds = (newBounds: Box) => {
    diagram.canvas = newBounds;
  };

  return (
    <ToolWindowPanel
      mode={props.mode ?? 'accordion'}
      id="canvas"
      title={'Canvas'}
      hasCheckbox={false}
    >
      <div className={'cmp-labeled-table'}>
        <div className={'cmp-labeled-table__label'}>Color:</div>
        <div className={'cmp-labeled-table__value'}>
          <ColorPicker
            palette={$cfg.palette.primary}
            value={bg.val ?? 'transparent'}
            onChange={v => {
              bg.set(v);
            }}
            customPalette={diagram.document.customPalette.colors}
            onChangeCustomPalette={(idx, v) => diagram.document.customPalette.setColor(idx, v)}
          />
        </div>

        <div
          className={'cmp-labeled-table__label'}
          style={{ alignSelf: 'start', marginTop: '0.25rem' }}
        >
          Size:
        </div>
        <div className={'cmp-labeled-table__value'}>
          <div
            style={{
              display: 'grid',
              gridTemplateAreas: '"x w" "y h"',
              gridTemplateRows: 'repeat(2, 1fr)',
              gridTemplateColumns: '1fr 1fr',
              alignItems: 'center',
              rowGap: '0.5rem',
              columnGap: '0.3em'
            }}
          >
            <div style={{ gridArea: 'x' }}>
              <NumberInput
                label={'x'}
                style={{ width: '100%' }}
                value={round(bounds.x)}
                validUnits={['px']}
                defaultUnit={'px'}
                onChange={ev => {
                  updateBounds({
                    ...bounds,
                    w: bounds.w + bounds.x - (ev ?? 0),
                    x: ev ?? 0
                  });
                }}
              />
            </div>
            <div style={{ gridArea: 'y' }}>
              <NumberInput
                style={{ width: '100%' }}
                label={'y'}
                value={round(bounds.y)}
                validUnits={['px']}
                defaultUnit={'px'}
                onChange={ev => {
                  updateBounds({
                    ...bounds,
                    h: bounds.h + bounds.y - (ev ?? 0),
                    y: ev ?? 0
                  });
                }}
              />
            </div>
            <div style={{ gridArea: 'w' }}>
              <NumberInput
                style={{ width: '100%' }}
                label={'w'}
                value={round(bounds.w)}
                validUnits={['px']}
                defaultUnit={'px'}
                onChange={ev => {
                  updateBounds({
                    ...bounds,
                    w: ev ?? 0
                  });
                }}
              />
            </div>
            <div style={{ gridArea: 'h' }}>
              <NumberInput
                style={{ width: '100%' }}
                label={'h'}
                value={round(bounds.h)}
                validUnits={['px']}
                defaultUnit={'px'}
                onChange={ev => {
                  updateBounds({
                    ...bounds,
                    h: ev ?? 0
                  });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </ToolWindowPanel>
  );
};

type Props = {
  mode?: 'accordion' | 'panel';
};
