import { TbLine, TbShape3, TbVectorBezier2, TbVectorSpline } from 'react-icons/tb';
import * as ReactToolbar from '@radix-ui/react-toolbar';
import { ArrowSelector } from './ArrowSelector.tsx';
import { ColorPicker } from '../ColorPicker.tsx';
import { additionalHues, primaryColors } from './palette.ts';
import { DashSelector } from './DashSelector.tsx';
import { useEdgeProperty } from './useProperty.ts';
import { NumberInput } from '../NumberInput.tsx';
import { assertEdgeType } from '../../model-viewer/diagramProps.ts';
import { useDiagram } from '../context/DiagramContext.tsx';

export const LineProperties = () => {
  const $d = useDiagram();

  const strokeColor = useEdgeProperty($d, 'stroke.color', 'transparent');
  const fillColor = useEdgeProperty($d, 'fill.color', undefined);
  const pattern = useEdgeProperty($d, 'stroke.pattern', 'SOLID');

  const strokSize = useEdgeProperty($d, 'stroke.patternSize', 100);
  const strokeSpacing = useEdgeProperty($d, 'stroke.patternSpacing', 100);
  const strokeWidth = useEdgeProperty($d, 'stroke.width', 1);

  const type = useEdgeProperty($d, 'type', 'straight');

  const startType = useEdgeProperty($d, 'arrow.start.type', undefined);
  const startSize = useEdgeProperty($d, 'arrow.start.size', 100);
  const endType = useEdgeProperty($d, 'arrow.end.type', undefined);

  const endSize = useEdgeProperty($d, 'arrow.end.size', 100);

  return (
    <div>
      <div className={'cmp-labeled-table'}>
        <div className={'cmp-labeled-table__label'}>Type:</div>
        <div className={'cmp-labeled-table__value'}>
          <ReactToolbar.Root className="cmp-toolbar" aria-label="Formatting options">
            <ReactToolbar.ToggleGroup
              type={'single'}
              value={type.val}
              onValueChange={value => {
                assertEdgeType(value);
                type.set(value);
              }}
            >
              <ReactToolbar.ToggleItem className="cmp-toolbar__toggle-item" value={'straight'}>
                <TbLine />
              </ReactToolbar.ToggleItem>
              <ReactToolbar.ToggleItem className="cmp-toolbar__toggle-item" value={'orthogonal'}>
                <TbShape3 />
              </ReactToolbar.ToggleItem>
              <ReactToolbar.ToggleItem className="cmp-toolbar__toggle-item" value={'curved'}>
                <TbVectorSpline />
              </ReactToolbar.ToggleItem>
              <ReactToolbar.ToggleItem className="cmp-toolbar__toggle-item" value={'bezier'}>
                <TbVectorBezier2 />
              </ReactToolbar.ToggleItem>
            </ReactToolbar.ToggleGroup>
          </ReactToolbar.Root>
        </div>

        <div className={'cmp-labeled-table__label'}>Line start:</div>
        <div className={'cmp-labeled-table__value util-vcenter'}>
          <ArrowSelector value={startType.val} onValueChange={startType.set} />
          &nbsp;
          <NumberInput
            validUnits={['%']}
            defaultUnit={'%'}
            value={startSize.val ?? ''}
            min={1}
            style={{ width: '50px' }}
            onChange={startSize.set}
          />
        </div>

        <div className={'cmp-labeled-table__label'}>Line end:</div>
        <div className={'cmp-labeled-table__value util-vcenter'}>
          <ArrowSelector value={endType.val} onValueChange={endType.set} />
          &nbsp;
          <NumberInput
            validUnits={['%']}
            defaultUnit={'%'}
            value={endSize.val ?? ''}
            min={1}
            style={{ width: '50px' }}
            onChange={endSize.set}
          />
        </div>

        <div className={'cmp-labeled-table__label'}>Color:</div>
        <div className={'cmp-labeled-table__value util-vcenter'}>
          <ColorPicker
            primaryColors={primaryColors}
            additionalHues={additionalHues}
            color={strokeColor.val ?? 'transparent'}
            onClick={strokeColor.set}
          />
          &nbsp;
          <ColorPicker
            primaryColors={primaryColors}
            additionalHues={additionalHues}
            color={fillColor.val ?? 'transparent'}
            onClick={fillColor.set}
          />
        </div>

        <div className={'cmp-labeled-table__label'}>Width:</div>
        <div className={'cmp-labeled-table__value'}>
          <NumberInput
            validUnits={['px']}
            defaultUnit={'px'}
            value={strokeWidth.val ?? 1}
            min={1}
            style={{ width: '45px' }}
            onChange={strokeWidth.set}
          />
        </div>

        <div className={'cmp-labeled-table__label'}>Dash:</div>
        <div className={'cmp-labeled-table__value util-vcenter'}>
          <DashSelector
            value={pattern.val}
            onValueChange={value => {
              pattern.set(value ?? 'SOLID');
            }}
          />
          &nbsp;
          <NumberInput
            validUnits={['%']}
            defaultUnit={'%'}
            value={strokSize.val ?? 100}
            min={1}
            style={{ width: '45px' }}
            onChange={strokSize.set}
          />
          &nbsp;
          <NumberInput
            validUnits={['%']}
            defaultUnit={'%'}
            value={strokeSpacing.val ?? 100}
            min={1}
            style={{ width: '45px' }}
            onChange={strokeSpacing.set}
          />
        </div>
      </div>
    </div>
  );
};
