import React from 'react';
import { useEventListener } from '../../hooks/useEventListener';
import { useRedraw } from '../../hooks/useRedraw';
import { NumberInput } from '@diagram-craft/app-components/NumberInput';
import { ToolWindowPanel } from '../ToolWindowPanel';
import { useDiagram } from '../../context/DiagramContext';
import { Select } from '@diagram-craft/app-components/Select';
import { UnitOfWork } from '@diagram-craft/model/unitOfWork';
import {
  CustomPropertyDefinition,
  EdgeDefinition,
  NodeDefinition
} from '@diagram-craft/model/elementDefinitionRegistry';
import { useTable } from '../../hooks/useTable';
import {
  TbColumnInsertLeft,
  TbColumnInsertRight,
  TbColumnRemove,
  TbColumns2,
  TbLayoutRows,
  TbRowInsertBottom,
  TbRowInsertTop,
  TbRowRemove
} from 'react-icons/tb';
import { ActionToolbarButton } from '../../toolbar/ActionToolbarButton';
import { commitWithUndo } from '@diagram-craft/model/diagramUndoActions';
import { Toolbar } from '@diagram-craft/app-components/Toolbar';

export const NodeTablePropertiesPanel = (props: Props) => {
  const diagram = useDiagram();
  const redraw = useRedraw();
  const element = useTable(diagram);

  useEventListener(diagram, 'elementChange', redraw);

  if (!element) {
    return <div></div>;
  }

  const def: EdgeDefinition | NodeDefinition = element.getDefinition();
  const customProperties: Array<CustomPropertyDefinition> =
    def.getCustomPropertyDefinitions(element);

  if (Object.keys(customProperties).length === 0) {
    return <div></div>;
  }

  return (
    <ToolWindowPanel mode={props.mode ?? 'accordion'} title={def.name} id={'custom'}>
      <Toolbar.Root>
        <ActionToolbarButton action={'TABLE_COLUMN_INSERT_BEFORE'}>
          <TbColumnInsertLeft className={'svg__insert'} />
        </ActionToolbarButton>
        <ActionToolbarButton action={'TABLE_COLUMN_INSERT_AFTER'}>
          <TbColumnInsertRight className={'svg__insert'} />
        </ActionToolbarButton>
        <ActionToolbarButton action={'TABLE_COLUMN_REMOVE'}>
          <TbColumnRemove className={'svg__remove'} />
        </ActionToolbarButton>

        <ActionToolbarButton action={'TABLE_ROW_INSERT_BEFORE'}>
          <TbRowInsertTop className={'svg__insert'} />
        </ActionToolbarButton>
        <ActionToolbarButton action={'TABLE_ROW_INSERT_AFTER'}>
          <TbRowInsertBottom className={'svg__insert'} />
        </ActionToolbarButton>
        <ActionToolbarButton action={'TABLE_ROW_REMOVE'}>
          <TbRowRemove className={'svg__remove'} />
        </ActionToolbarButton>

        <Toolbar.Separator />

        <ActionToolbarButton action={'TABLE_COLUMN_DISTRIBUTE'}>
          <TbColumns2 />
        </ActionToolbarButton>
        <ActionToolbarButton action={'TABLE_ROW_DISTRIBUTE'}>
          <TbLayoutRows />
        </ActionToolbarButton>
      </Toolbar.Root>

      <div className={'cmp-labeled-table'}>
        {Object.entries(customProperties).map(([key, value]) => {
          if (value.type === 'number') {
            return (
              <React.Fragment key={key}>
                <div className={'cmp-labeled-table__label'}>{value.label}:</div>
                <div className={'cmp-labeled-table__value'}>
                  <NumberInput
                    defaultUnit={value.unit ?? ''}
                    validUnits={value.unit ? [value.unit] : []}
                    value={value.value}
                    min={value.minValue ?? 0}
                    max={value.maxValue ?? 100}
                    step={value.step ?? 1}
                    style={{ width: '50px' }}
                    onChange={ev => {
                      const uow = new UnitOfWork(diagram, true);
                      value.onChange(ev ?? 0, uow);
                      commitWithUndo(uow, `Change ${value.label}`);
                    }}
                  />
                </div>
              </React.Fragment>
            );
          } else if (value.type === 'boolean') {
            return (
              <React.Fragment key={key}>
                <div className={'cmp-labeled-table__label'}>{value.label}:</div>
                <div className={'cmp-labeled-table__value'}>
                  <input
                    type="checkbox"
                    checked={value.value}
                    onChange={() => {
                      const uow = new UnitOfWork(diagram, true);
                      value.onChange(!value.value, uow);
                      commitWithUndo(uow, `Change ${value.label}`);
                    }}
                  />
                </div>
              </React.Fragment>
            );
          } else if (value.type === 'select') {
            return (
              <React.Fragment key={key}>
                <div className={'cmp-labeled-table__label'}>{value.label}:</div>
                <div className={'cmp-labeled-table__value'}>
                  <Select.Root
                    onValueChange={v => {
                      const uow = new UnitOfWork(diagram, true);
                      value.onChange(v, uow);
                      commitWithUndo(uow, `Change ${value.label}`);
                    }}
                    value={value.value}
                  >
                    {value.options.map(o => (
                      <Select.Item key={o.value} value={o.value}>
                        {o.label}
                      </Select.Item>
                    ))}
                  </Select.Root>
                </div>
              </React.Fragment>
            );
          }
        })}
      </div>
    </ToolWindowPanel>
  );
};

type Props = {
  mode?: 'accordion' | 'panel';
};
