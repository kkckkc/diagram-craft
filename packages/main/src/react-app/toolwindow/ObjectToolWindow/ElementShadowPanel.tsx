import { round } from '@diagram-craft/utils/math';
import { useDiagram } from '../../context/DiagramContext';
import { useConfiguration } from '../../context/ConfigurationContext';
import { useElementProperty } from '../../hooks/useProperty';
import { ToolWindowPanel } from '../ToolWindowPanel';
import { ColorPicker } from '../../components/ColorPicker';
import { NumberInput } from '@diagram-craft/app-components/NumberInput';

export const ElementShadowPanel = (props: Props) => {
  const $d = useDiagram();
  const $cfg = useConfiguration();

  const color = useElementProperty($d, 'shadow.color');
  const opacity = useElementProperty($d, 'shadow.opacity');
  const x = useElementProperty($d, 'shadow.x');
  const y = useElementProperty($d, 'shadow.y');
  const blur = useElementProperty($d, 'shadow.blur');
  const enabled = useElementProperty($d, 'shadow.enabled');

  return (
    <ToolWindowPanel
      mode={props.mode ?? 'accordion'}
      title={'Shadow'}
      id={'shadow'}
      hasCheckbox={true}
      value={enabled.val}
      onChange={enabled.set}
    >
      <div className={'cmp-labeled-table'}>
        <div className={'cmp-labeled-table__label'}>Color:</div>
        <div className={'cmp-labeled-table__value util-vcenter util-hstack'}>
          <ColorPicker
            palette={$cfg.palette.primary}
            color={color.val}
            onChange={color.set}
            customPalette={$d.document.customPalette.colors}
            onChangeCustomPalette={(idx, v) => $d.document.customPalette.setColor(idx, v)}
          />
          <NumberInput
            value={round((1 - opacity.val) * 100).toString()}
            onChange={v => opacity.set((100 - (v ?? 100)) / 100)}
            style={{ width: '45px' }}
            min={0}
            max={100}
            defaultUnit={'%'}
          />
        </div>
        <div className={'cmp-labeled-table__label'}>Position:</div>
        <div className={'cmp-labeled-table__value util-vcenter util-hstack'}>
          <NumberInput
            value={x.val}
            onChange={x.set}
            style={{ width: '45px' }}
            defaultUnit={'px'}
          />
          <NumberInput
            value={y.val}
            onChange={y.set}
            style={{ width: '45px' }}
            defaultUnit={'px'}
          />
          <NumberInput
            value={blur.val}
            onChange={blur.set}
            min={0}
            style={{ width: '45px' }}
            defaultUnit={'px'}
          />
        </div>
      </div>
    </ToolWindowPanel>
  );
};

type Props = {
  mode?: 'accordion' | 'panel';
};
