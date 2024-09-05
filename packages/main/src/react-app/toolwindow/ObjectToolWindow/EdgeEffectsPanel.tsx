import { round } from '@diagram-craft/utils/math';
import { useRedraw } from '../../hooks/useRedraw';
import { useDiagram } from '../../context/DiagramContext';
import { useEdgeProperty } from '../../hooks/useProperty';
import { useEventListener } from '../../hooks/useEventListener';
import { ToolWindowPanel } from '../ToolWindowPanel';
import { Slider } from '@diagram-craft/app-components/Slider';
import { Checkbox } from '@diagram-craft/app-components/Checkbox';
import { PropertyEditor } from '../../components/PropertyEditor';

// TODO: We should merge this with NodeEffectsPanel
//       ... only sketch is common between the two
//       ... but we could also keep blur in both
export const EdgeEffectsPanel = (props: Props) => {
  const redraw = useRedraw();
  const $d = useDiagram();

  const opacity = useEdgeProperty($d, 'effects.opacity');

  const sketch = useEdgeProperty($d, 'effects.sketch');
  const sketchStrength = useEdgeProperty($d, 'effects.sketchStrength');

  useEventListener($d.selectionState, 'change', redraw);

  return (
    <ToolWindowPanel
      mode={props.mode ?? 'accordion'}
      id="effects"
      title={'Effects'}
      hasCheckbox={false}
    >
      <div>
        <div className={'cmp-labeled-table'}>
          <div className={'cmp-labeled-table__label'}>Opacity:</div>
          <div className={'cmp-labeled-table__value'}>
            <Slider
              value={round(opacity.val * 100)}
              onChange={v => {
                opacity.set(v === undefined ? undefined : Number(v) / 100);
              }}
              defaultValue={round(opacity.defaultVal * 100)}
              isDefaultValue={!opacity.isSet}
            />
          </div>

          <div className={'cmp-labeled-table__label'}>Sketch:</div>
          <div className={'cmp-labeled-table__value'}>
            <PropertyEditor property={sketch} render={props => <Checkbox {...props} />} />
          </div>

          <div className={'cmp-labeled-table__label'}></div>
          <div className={'cmp-labeled-table__value'}>
            <Slider
              value={round(sketchStrength.val * 100)}
              onChange={v => {
                sketchStrength.set(v === undefined ? undefined : Number(v) / 100);
              }}
              max={25}
              defaultValue={round(sketchStrength.defaultVal * 100)}
              isDefaultValue={!sketchStrength.isSet}
            />
          </div>
        </div>
      </div>
    </ToolWindowPanel>
  );
};

type Props = {
  mode?: 'accordion' | 'panel';
};
