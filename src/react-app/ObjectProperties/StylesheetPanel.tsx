import { ToolWindowPanel } from '../ToolWindowPanel.tsx';
import { Select } from '../components/Select.tsx';
import { TbDots } from 'react-icons/tb';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useDiagram } from '../context/DiagramContext.tsx';
import { useElementProperty } from './useProperty.ts';
import { newid } from '../../utils/id.ts';
import { UnitOfWork } from '../../model/unitOfWork.ts';
import { commitWithUndo, SnapshotUndoableAction } from '../../model/diagramUndoActions.ts';
import { useState } from 'react';
import { MessageDialog, MessageDialogState } from '../components/MessageDialog.tsx';
import {
  AddStylesheetUndoableAction,
  DeleteStylesheetUndoableAction,
  getCommonProps,
  isPropsDirty,
  Stylesheet
} from '../../model/diagramStyles.ts';
import { isNode } from '../../model/diagramElement.ts';
import { useRedraw } from '../../react-canvas-viewer/useRedraw.tsx';
import { useEventListener } from '../hooks/useEventListener.ts';
import { CompoundUndoableAction } from '../../model/undoManager.ts';
import { StringInputDialog } from '../components/StringInputDialog.tsx';
import { JSONDialog } from '../components/JSONDialog.tsx';

export const StylesheetPanel = (props: Props) => {
  const $d = useDiagram();
  const redraw = useRedraw();

  useEventListener($d.selectionState, 'change', redraw);
  useEventListener($d, 'change', redraw);

  const style = useElementProperty($d, 'style', 'default');

  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState<MessageDialogState>(
    MessageDialog.INITIAL_STATE
  );
  const [newDialog, setNewDialog] = useState(false);
  const [modifyDialog, setModifyDialog] = useState<Stylesheet | undefined>(undefined);
  const [renameDialog, setRenameDialog] = useState<Stylesheet | undefined>(undefined);

  const stylesheet = $d.document.styles.get($d.selectionState.elements[0].props.style!)!;
  const isDirty =
    !style.hasMultipleValues &&
    $d.selectionState.elements.some(e => isPropsDirty(e.props, stylesheet.props));

  const styleList = $d.selectionState.isNodesOnly()
    ? $d.document.styles.nodeStyles
    : $d.document.styles.edgeStyles;

  return (
    <ToolWindowPanel
      mode={props.mode ?? 'accordion'}
      id="stylesheet"
      title={'Style'}
      hasCheckbox={false}
    >
      <div className={'cmp-labeled-table'}>
        <div className={'cmp-labeled-table__label'}>Style:</div>
        <div className={'cmp-labeled-table__value util-hstack'}>
          <Select
            value={style.val}
            values={styleList.map(e => ({
              value: e.id,
              label: isDirty && e.id === style.val ? `${e.name} ∗` : e.name
            }))}
            hasMultipleValues={style.hasMultipleValues}
            onValueChange={v => {
              style.set(v);
            }}
          />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className={'cmp-button'}>
                <TbDots />
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content className="cmp-context-menu" sideOffset={5}>
                <DropdownMenu.Item
                  className="cmp-context-menu__item"
                  onSelect={() => {
                    const uow = new UnitOfWork($d, true);
                    $d.selectionState.elements.forEach(n => {
                      $d.document.styles.setStylesheet(n, style.val, uow);
                    });
                    commitWithUndo(uow, 'Reapply style');
                  }}
                >
                  Reapply
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="cmp-context-menu__item"
                  onSelect={() => {
                    // TODO: Maybe to ask confirmation to apply to all selected nodes or copy
                    const uow = new UnitOfWork($d, true);
                    const stylesheet = $d.document.styles.get(style.val);
                    if (stylesheet) {
                      stylesheet.setProps(
                        getCommonProps($d.selectionState.elements.map(e => e.propsForEditing)) as
                          | NodeProps
                          | EdgeProps,
                        uow
                      );
                      $d.selectionState.elements.forEach(n => {
                        $d.document.styles.setStylesheet(n, style.val, uow);
                      });
                    }
                    commitWithUndo(uow, 'Redefine style');
                  }}
                >
                  Redefine from current
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="cmp-context-menu__item"
                  onSelect={() => {
                    setConfirmDeleteDialog({
                      isOpen: true,
                      title: 'Confirm delete',
                      message: 'Are you sure you want to delete this style?',
                      buttons: [
                        {
                          label: 'Yes',
                          type: 'danger',
                          onClick: () => {
                            const uow = new UnitOfWork($d, true);

                            const s = $d.document.styles.get(style.val)!;
                            $d.document.styles.deleteStylesheet(style.val, uow);

                            const snapshots = uow.commit();
                            uow.diagram.undoManager.add(
                              new CompoundUndoableAction([
                                new DeleteStylesheetUndoableAction(uow.diagram, s),
                                new SnapshotUndoableAction('Delete style', uow.diagram, snapshots)
                              ])
                            );
                          }
                        },
                        { label: 'No', type: 'cancel', onClick: () => {} }
                      ]
                    });
                  }}
                >
                  Delete
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="cmp-context-menu__item"
                  onSelect={() => {
                    setModifyDialog($d.document.styles.get(style.val));
                  }}
                >
                  Modify
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  className="cmp-context-menu__item"
                  onSelect={() => {
                    setRenameDialog($d.document.styles.get(style.val));
                  }}
                >
                  Rename
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="cmp-context-menu__separator" />
                <DropdownMenu.Item
                  className="cmp-context-menu__item"
                  onSelect={() => {
                    setNewDialog(true);
                  }}
                >
                  Add new
                </DropdownMenu.Item>
                <DropdownMenu.Arrow className="cmp-context-menu__arrow" />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <MessageDialog
            {...confirmDeleteDialog}
            onClose={() => setConfirmDeleteDialog(MessageDialog.INITIAL_STATE)}
          />

          <StringInputDialog
            isOpen={newDialog}
            onClose={() => setNewDialog(!newDialog)}
            label={'Name'}
            title={'New style'}
            saveButtonLabel={'Create'}
            name={renameDialog?.name ?? ''}
            onSave={v => {
              const id = newid();
              const s = new Stylesheet(
                isNode($d.selectionState.elements[0]) ? 'node' : 'edge',
                id,
                v,
                {
                  ...(getCommonProps($d.selectionState.elements.map(e => e.propsForEditing)) as
                    | NodeProps
                    | EdgeProps),
                  style: undefined,
                  highlight: []
                }
              );
              const uow = new UnitOfWork($d, true);

              $d.document.styles.addStylesheet(s, uow);
              $d.document.styles.setStylesheet($d.selectionState.nodes[0], id, uow);

              const snapshots = uow.commit();
              uow.diagram.undoManager.add(
                new CompoundUndoableAction([
                  new AddStylesheetUndoableAction(uow.diagram, s),
                  new SnapshotUndoableAction('Delete style', uow.diagram, snapshots)
                ])
              );
            }}
          />

          <JSONDialog
            isOpen={modifyDialog !== undefined}
            onClose={() => setModifyDialog(undefined)}
            title={'Modify style'}
            label={'Style definition'}
            data={{
              props: {
                ...(modifyDialog?.props ?? {}),
                highlight: []
              }
            }}
            onModify={e => {
              // TODO: Maybe to ask confirmation to apply to all selected nodes or copy
              const uow = new UnitOfWork($d, true);
              const stylesheet = $d.document.styles.get(modifyDialog!.id);
              if (stylesheet) {
                stylesheet.setProps(e.props, uow);
                commitWithUndo(uow, 'Modify style');
              } else {
                uow.abort();
              }
            }}
          />

          <StringInputDialog
            isOpen={renameDialog !== undefined}
            onClose={() => setRenameDialog(undefined)}
            label={'Name'}
            title={'Rename style'}
            description={'Enter a new name for the style.'}
            saveButtonLabel={'Rename'}
            name={renameDialog?.name ?? ''}
            onSave={v => {
              const uow = new UnitOfWork($d, true);
              const stylesheet = $d.document.styles.get(renameDialog!.id)!;
              stylesheet.setName(v, uow);
              commitWithUndo(uow, 'Rename style');
            }}
          />
        </div>
      </div>
    </ToolWindowPanel>
  );
};

type Props = {
  mode?: 'accordion' | 'panel';
};
