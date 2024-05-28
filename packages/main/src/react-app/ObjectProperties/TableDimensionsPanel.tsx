import { useEventListener } from '../hooks/useEventListener';
import { useRedraw } from '../useRedraw';
import { ToolWindowPanel } from '../ToolWindowPanel';
import { useDiagram } from '../context/DiagramContext';
import { DiagramNode } from '@diagram-craft/model/diagramNode';
import { useTable } from './useTable';
import { NumberInput } from '../components/NumberInput';
import { UnitOfWork } from '@diagram-craft/model/unitOfWork';
import { commitWithUndo } from '@diagram-craft/model/diagramUndoActions';

export const TableDimensionsPanel = (props: Props) => {
  const diagram = useDiagram();
  const redraw = useRedraw();

  useEventListener(diagram, 'elementChange', redraw);

  const table = useTable(diagram);

  if (!table) return <div></div>;

  const rows = table.children.length;
  const columns = (table.children as DiagramNode[])[0]?.children?.length ?? 0;

  const updateRows = (r: number) => {
    if (r > rows) {
      const uow = new UnitOfWork(diagram, true);

      for (let n = 0; n < r - rows; n++) {
        const row = (table.children.at(-1) as DiagramNode).duplicate();
        uow.snapshot(row);
        table.addChild(row, uow);
        diagram.layers.active.addElement(row, uow);
      }

      commitWithUndo(uow, 'Adding row');
    } else if (r < rows) {
      const uow = new UnitOfWork(diagram, true);
      for (let n = 0; n < rows - r; n++) {
        const row = table.children.at(-1) as DiagramNode;
        uow.snapshot(row);
        table.removeChild(row, uow);
        diagram.layers.active.removeElement(row, uow);
      }
      commitWithUndo(uow, 'Deleting row');
    }
  };

  const updateColumns = (c: number) => {
    if (c > columns) {
      const uow = new UnitOfWork(diagram, true);

      for (let n = 0; n < c - columns; n++) {
        for (let i = 0; i < rows; i++) {
          const row = table.children[i] as DiagramNode;
          for (let j = columns; j < c; j++) {
            const child = (row.children.at(-1) as DiagramNode).duplicate();
            uow.snapshot(child);
            row.addChild(child, uow);
            diagram.layers.active.addElement(child, uow);
          }
        }
      }

      commitWithUndo(uow, 'Adding column');
    } else if (c < columns) {
      const uow = new UnitOfWork(diagram, true);
      for (let n = 0; n < columns - c; n++) {
        for (let i = 0; i < rows; i++) {
          const row = table.children[i] as DiagramNode;
          const child = row.children.at(-1) as DiagramNode;
          uow.snapshot(child);
          row.removeChild(child, uow);
          diagram.layers.active.removeElement(child, uow);
        }
      }
      commitWithUndo(uow, 'Deleting column');
    }
  };

  return (
    <ToolWindowPanel mode={props.mode ?? 'accordion'} title={'Dimensions'} id={'dimensions'}>
      <div className={'cmp-labeled-table'}>
        <div className={'cmp-labeled-table__label'}>Rows:</div>
        <div className={'cmp-labeled-table__value'}>
          <NumberInput
            value={rows}
            min={1}
            max={100}
            step={1}
            style={{ width: '50px' }}
            onChange={ev => updateRows(ev ?? 1)}
          />
        </div>
        <div className={'cmp-labeled-table__label'}>Columns:</div>
        <div className={'cmp-labeled-table__value'}>
          <NumberInput
            value={columns}
            min={1}
            max={100}
            step={1}
            style={{ width: '50px' }}
            onChange={ev => updateColumns(ev ?? 1)}
          />
        </div>
      </div>
    </ToolWindowPanel>
  );
};

type Props = {
  mode?: 'accordion' | 'panel';
};
