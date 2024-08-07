import { TbLine, TbShape3, TbVectorBezier2, TbVectorSpline } from 'react-icons/tb';
import { ArrowSelector } from './components/ArrowSelector';
import { assertEdgeType } from '@diagram-craft/model/diagramProps';
import { useDiagram } from '../../context/DiagramContext';
import { useConfiguration } from '../../context/ConfigurationContext';
import { useEdgeProperty } from '../../hooks/useProperty';
import { ToolWindowPanel } from '../ToolWindowPanel';
import { NumberInput } from '@diagram-craft/app-components/NumberInput';
import { ColorPicker } from '../../components/ColorPicker';
import { DashSelector } from './components/DashSelector';
import { Select } from '@diagram-craft/app-components/Select';
import { ToggleButtonGroup } from '@diagram-craft/app-components/ToggleButtonGroup';

export const EdgeLinePanel = (props: Props) => {
  const $d = useDiagram();
  const $cfg = useConfiguration();

  const strokeColor = useEdgeProperty($d, 'stroke.color');
  const fillColor = useEdgeProperty($d, 'fill.color');
  const pattern = useEdgeProperty($d, 'stroke.pattern');

  const strokeSize = useEdgeProperty($d, 'stroke.patternSize');
  const strokeSpacing = useEdgeProperty($d, 'stroke.patternSpacing');
  const strokeWidth = useEdgeProperty($d, 'stroke.width');

  const type = useEdgeProperty($d, 'type', 'straight');

  const startType = useEdgeProperty($d, 'arrow.start.type');
  const startSize = useEdgeProperty($d, 'arrow.start.size');
  const endType = useEdgeProperty($d, 'arrow.end.type');
  const endSize = useEdgeProperty($d, 'arrow.end.size');

  const rounding = useEdgeProperty($d, 'routing.rounding');

  const lineHopsSize = useEdgeProperty($d, 'lineHops.size');
  const lineHopsType = useEdgeProperty($d, 'lineHops.type');

  const lineCap = useEdgeProperty($d, 'stroke.lineCap');
  const lineJoin = useEdgeProperty($d, 'stroke.lineJoin');
  const miterLimit = useEdgeProperty($d, 'stroke.miterLimit');

  const supportsArrows =
    !$d.selectionState.isEdgesOnly() ||
    $d.selectionState.edges.some(e => e.getDefinition().supports('arrows'));

  const supportsLineHops =
    !$d.selectionState.isEdgesOnly() ||
    $d.selectionState.edges.some(e => e.getDefinition().supports('line-hops'));

  const supportsFill =
    !$d.selectionState.isEdgesOnly() ||
    $d.selectionState.edges.every(e => e.getDefinition().supports('fill'));

  return (
    <ToolWindowPanel mode={props.mode ?? 'accordion'} id="line" title={'Line'} hasCheckbox={false}>
      <div>
        <div className={'cmp-labeled-table'}>
          <div className={'cmp-labeled-table__label'}>Type:</div>
          <div className={'cmp-labeled-table__value'}>
            <ToggleButtonGroup.Root
              aria-label="Formatting options"
              type={'single'}
              value={type.val}
              onValueChange={value => {
                assertEdgeType(value);
                type.set(value);
              }}
            >
              <ToggleButtonGroup.Item value={'straight'}>
                <TbLine />
              </ToggleButtonGroup.Item>
              <ToggleButtonGroup.Item value={'orthogonal'}>
                <TbShape3 />
              </ToggleButtonGroup.Item>
              <ToggleButtonGroup.Item value={'curved'}>
                <TbVectorSpline />
              </ToggleButtonGroup.Item>
              <ToggleButtonGroup.Item value={'bezier'}>
                <TbVectorBezier2 />
              </ToggleButtonGroup.Item>
            </ToggleButtonGroup.Root>
          </div>

          {supportsArrows && (
            <>
              <div className={'cmp-labeled-table__label'}>Line start:</div>
              <div className={'cmp-labeled-table__value util-vcenter util-hstack'}>
                <ArrowSelector value={startType.val} onValueChange={startType.set} />
                <NumberInput
                  defaultUnit={'%'}
                  value={startSize.val}
                  min={1}
                  style={{ width: '50px' }}
                  onChange={startSize.set}
                />
              </div>

              <div className={'cmp-labeled-table__label'}>Line end:</div>
              <div className={'cmp-labeled-table__value util-vcenter util-hstack'}>
                <ArrowSelector value={endType.val} onValueChange={endType.set} />
                <NumberInput
                  defaultUnit={'%'}
                  value={endSize.val}
                  min={1}
                  style={{ width: '50px' }}
                  onChange={endSize.set}
                />
              </div>
            </>
          )}

          <div className={'cmp-labeled-table__label'}>Color:</div>
          <div className={'cmp-labeled-table__value util-vcenter util-hstack'}>
            <ColorPicker
              palette={$cfg.palette.primary}
              color={strokeColor.val}
              onChange={strokeColor.set}
              customPalette={$d.document.customPalette.colors}
              onChangeCustomPalette={(idx, v) => $d.document.customPalette.setColor(idx, v)}
            />
            {!supportsFill && (
              <ColorPicker
                palette={$cfg.palette.primary}
                color={fillColor.val}
                onChange={fillColor.set}
                customPalette={$d.document.customPalette.colors}
                onChangeCustomPalette={(idx, v) => $d.document.customPalette.setColor(idx, v)}
              />
            )}
          </div>

          <div className={'cmp-labeled-table__label'}>Width:</div>
          <div className={'cmp-labeled-table__value'}>
            <NumberInput
              defaultUnit={'px'}
              value={strokeWidth.val}
              min={1}
              style={{ width: '45px' }}
              onChange={strokeWidth.set}
            />
          </div>

          <div className={'cmp-labeled-table__label'}>Dash:</div>
          <div className={'cmp-labeled-table__value util-vcenter util-hstack'}>
            <DashSelector value={pattern.val} onValueChange={pattern.set} />
            <NumberInput
              defaultUnit={'%'}
              value={strokeSize.val}
              min={1}
              style={{ width: '45px' }}
              onChange={strokeSize.set}
            />
            <NumberInput
              defaultUnit={'%'}
              value={strokeSpacing.val}
              min={1}
              style={{ width: '45px' }}
              onChange={strokeSpacing.set}
            />
          </div>

          {supportsLineHops && (
            <>
              <div className={'cmp-labeled-table__label util-a-top-center'}>Line hops:</div>
              <div className={'cmp-labeled-table__value util-vcenter'}>
                <div className={'util-vstack'} style={{ width: '100%' }}>
                  <Select.Root
                    onValueChange={v => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      lineHopsType.set(v as any);
                    }}
                    value={lineHopsType.val}
                  >
                    <Select.Item value={'none'}>None</Select.Item>
                    <Select.Item value={'below-hide'}>Gap when below</Select.Item>
                    <Select.Item value={'below-line'}>Gap with line when below</Select.Item>
                    <Select.Item value={'below-arc'}>Arc when below</Select.Item>
                    <Select.Item value={'above-arc'}>Arc when above</Select.Item>
                  </Select.Root>

                  <NumberInput
                    defaultUnit={'px'}
                    value={lineHopsSize.val}
                    min={0}
                    style={{ width: '50px' }}
                    onChange={lineHopsSize.set}
                  />
                </div>
              </div>
            </>
          )}

          <div className={'cmp-labeled-table__label'}>Line cap:</div>
          <div className={'cmp-labeled-table__value util-hstack'}>
            <Select.Root
              onValueChange={v => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                lineCap.set(v as any);
              }}
              value={lineCap.val}
            >
              <Select.Item value={'butt'}>Butt</Select.Item>
              <Select.Item value={'round'}>Round</Select.Item>
              <Select.Item value={'square'}>Square</Select.Item>
            </Select.Root>
          </div>

          <div className={'cmp-labeled-table__label'}>Line join:</div>
          <div className={'cmp-labeled-table__value util-hstack'}>
            <Select.Root
              onValueChange={v => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                lineJoin.set(v as any);
              }}
              value={lineJoin.val}
            >
              <Select.Item value={'miter'}>Miter</Select.Item>
              <Select.Item value={'round'}>Round</Select.Item>
              <Select.Item value={'bevel'}>Bevel</Select.Item>
            </Select.Root>

            {lineJoin.val === 'miter' && (
              <NumberInput
                value={miterLimit.val * 10}
                min={0}
                style={{ width: '50px' }}
                onChange={v => miterLimit.set((v ?? 1) / 10)}
              />
            )}

            {lineJoin.val === 'round' && (
              <NumberInput
                defaultUnit={'px'}
                value={rounding.val}
                min={0}
                style={{ width: '50px' }}
                onChange={rounding.set}
              />
            )}
          </div>
        </div>
      </div>
    </ToolWindowPanel>
  );
};

type Props = {
  mode?: 'accordion' | 'panel';
};
