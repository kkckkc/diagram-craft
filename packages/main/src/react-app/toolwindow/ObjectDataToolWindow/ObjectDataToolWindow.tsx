import { AccordionTrigger } from '../../components/AccordionTrigger';
import { AccordionContent } from '../../components/AccordionContent';
import * as Accordion from '@radix-ui/react-accordion';
import { useDiagram } from '../../context/DiagramContext';
import React, { ChangeEvent, useCallback, useState } from 'react';
import { useRedraw } from '../../hooks/useRedraw';
import { useEventListener } from '../../hooks/useEventListener';
import { TbDots, TbPencil, TbTrash, TbX } from 'react-icons/tb';
import { MessageDialog, MessageDialogState } from '../../components/MessageDialog';
import { JSONDialog } from '../../components/JSONDialog';
import {
  AddSchemaUndoableAction,
  DataSchema,
  DeleteSchemaUndoableAction,
  ModifySchemaUndoableAction
} from '@diagram-craft/model/diagramDataSchemas';
import { UnitOfWork } from '@diagram-craft/model/unitOfWork';
import { commitWithUndo, SnapshotUndoableAction } from '@diagram-craft/model/diagramUndoActions';
import { CompoundUndoableAction } from '@diagram-craft/model/undoManager';
import { newid } from '@diagram-craft/utils/id';
import { unique } from '@diagram-craft/utils/array';
import { Collapsible } from '../../components/Collapsible';
import { VERIFY_NOT_REACHED } from '@diagram-craft/utils/assert';
import * as Popover from '@radix-ui/react-popover';
import { useElementProperty } from '../../hooks/useProperty';

const makeTemplate = (): DataSchema => {
  return {
    id: newid(),
    name: 'New schema',
    fields: [
      {
        id: 'field1',
        name: 'Field 1',
        type: 'text'
      },
      {
        id: 'field2',
        name: 'Field 2',
        type: 'longtext'
      }
    ]
  };
};

export const ObjectDataToolWindow = () => {
  const $d = useDiagram();
  const redraw = useRedraw();

  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState<MessageDialogState>(
    MessageDialog.INITIAL_STATE
  );

  const [modifyDialog, setModifyDialog] = useState<DataSchema | undefined>(undefined);

  useEventListener($d.selectionState, 'change', redraw);
  useEventListener($d, 'change', redraw);

  const name = useElementProperty($d, 'name');

  const changeCallback = useCallback(
    (
      type: 'data' | 'custom',
      schema: string,
      id: string,
      ev: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
      const uow = new UnitOfWork($d, true);

      if (type === 'data') {
        $d.selectionState.elements.forEach(e => {
          e.updateProps(p => {
            p.data ??= {};
            p.data.data ??= [];
            let s = p.data.data.find(e => e.schema === schema);
            if (!s) {
              s = { schema, type: 'schema', data: {} };
              p.data.data.push(s);
            }
            s.data[id] = (ev.target! as HTMLInputElement).value;
          }, uow);
        });
      } else if (type === 'custom') {
        $d.selectionState.elements.forEach(e => {
          e.updateProps(p => {
            p.data ??= {};
            p.data.customData ??= {};
            p.data.customData[id] = (ev.target! as HTMLInputElement).value;
          }, uow);
        });
      } else {
        VERIFY_NOT_REACHED();
      }
      commitWithUndo(uow, 'Update data');
    },
    [$d]
  );

  const addSchemaToSelection = useCallback(
    (schema: string) => {
      $d.selectionState.elements.forEach(e => {
        const entry = e.editProps.data?.data?.find(s => s.schema === schema);
        if (!entry) {
          const uow = new UnitOfWork($d, true);
          e.updateProps(p => {
            p.data ??= {};
            p.data.data ??= [];
            p.data.data.push({ enabled: true, schema, type: 'schema', data: {} });
          }, uow);
          commitWithUndo(uow, 'Add schema to selection');
        } else if (!entry.enabled) {
          const uow = new UnitOfWork($d, true);
          e.updateProps(p => {
            p.data!.data!.find(s => s.schema === schema)!.enabled = true;
          }, uow);
          commitWithUndo(uow, 'Add schema to selection');
        }
      });
    },
    [$d]
  );

  const removeSchemaFromSelection = useCallback(
    (schema: string) => {
      $d.selectionState.elements.forEach(e => {
        const entry = e.editProps.data?.data?.find(s => s.schema === schema);
        if (entry?.enabled) {
          const uow = new UnitOfWork($d, true);
          e.updateProps(p => {
            p.data!.data!.find(s => s.schema === schema)!.enabled = false;
          }, uow);
          commitWithUndo(uow, 'Add schema to selection');
        }
      });
    },
    [$d]
  );

  const customDataKeys = unique(
    $d.selectionState.elements.flatMap(e => Object.keys(e.renderProps.data?.customData ?? {}))
  ).toSorted();

  // Get all schemas from all selected elements
  const schemas = $d.selectionState.elements.flatMap(e =>
    e.editProps.data?.data?.filter(d => d.enabled).map(d => d.schema)
  );

  if ($d.selectionState.elements.length === 0)
    return (
      <Accordion.Root className="cmp-accordion" type="single" defaultValue={'data'}>
        <Accordion.Item className="cmp-accordion__item" value="data">
          <AccordionTrigger>Data</AccordionTrigger>
          <AccordionContent>&nbsp;</AccordionContent>
        </Accordion.Item>
      </Accordion.Root>
    );

  return (
    <>
      <Accordion.Root className="cmp-accordion" type="multiple" defaultValue={['data', 'basic']}>
        {$d.selectionState.elements.length === 1 && (
          <Accordion.Item className="cmp-accordion__item" value="basic">
            <AccordionTrigger>Name</AccordionTrigger>
            <AccordionContent>
              <div className={'cmp-labeled-table'}>
                <div className={'cmp-labeled-table__label util-a-top-center'}>Name:</div>
                <div className={'cmp-labeled-table__value cmp-text-input'}>
                  <input type={'text'} value={name.val} onChange={e => name.set(e.target.value)} />
                </div>
              </div>
            </AccordionContent>
          </Accordion.Item>
        )}
        <Accordion.Item className="cmp-accordion__item" value="data">
          <AccordionTrigger>
            Data
            <div className={'cmp-accordion__header_btn'}>
              <Popover.Root>
                <Popover.Trigger asChild>
                  <a href={'#'}>
                    <TbDots />
                  </a>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content className="cmp-popover cmp-popover--toolbar" sideOffset={15}>
                    <div className={'cmp-schema-selector'}>
                      <h2
                        className={'util-hstack'}
                        style={{ gap: '0.5rem', marginBottom: '0.75rem' }}
                      >
                        Schemas
                      </h2>
                      <div className={'cmp-schema-selector__schemas'}>
                        {$d.document.schemas.all.map(s => (
                          <div key={s.id} className={'cmp-schema-selector__schema'}>
                            <input
                              type={'checkbox'}
                              checked={schemas.includes(s.id)}
                              onChange={e => {
                                if (e.currentTarget.checked) {
                                  addSchemaToSelection(s.id);
                                } else {
                                  removeSchemaFromSelection(s.id);
                                }
                              }}
                            />
                            {s.name}
                            <div className={'cmp-schema-selector__schema-actions'}>
                              <button
                                onClick={() => {
                                  setModifyDialog(s);
                                }}
                              >
                                <TbPencil />
                              </button>
                              <button
                                onClick={() => {
                                  setConfirmDeleteDialog({
                                    isOpen: true,
                                    title: 'Confirm delete',
                                    message: 'Are you sure you want to delete this schema?',
                                    buttons: [
                                      {
                                        label: 'Yes',
                                        type: 'danger',
                                        onClick: () => {
                                          const uow = new UnitOfWork($d, true);
                                          const schemas = $d.document.schemas;
                                          schemas.removeSchema(s, uow);

                                          const snapshots = uow.commit();
                                          $d.undoManager.add(
                                            new CompoundUndoableAction([
                                              new DeleteSchemaUndoableAction(uow.diagram, s),
                                              new SnapshotUndoableAction(
                                                'Delete schema',
                                                uow.diagram,
                                                snapshots
                                              )
                                            ])
                                          );
                                          redraw();
                                        }
                                      },
                                      {
                                        label: 'No',
                                        type: 'cancel',
                                        onClick: () => {}
                                      }
                                    ]
                                  });
                                }}
                              >
                                <TbTrash />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className={'cmp-schema-selector__buttons'}>
                        <button
                          className={'cmp-button cmp-button--secondary'}
                          onClick={() => {
                            setModifyDialog(makeTemplate());
                          }}
                        >
                          Add Schema
                        </button>
                      </div>
                    </div>
                    <Popover.Close className="cmp-popover__close" aria-label="Close">
                      <TbX />
                    </Popover.Close>
                    <Popover.Arrow className="cmp-popover__arrow" />
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            {/*<div className={'cmp-labeled-table'}>
            <div className={'cmp-labeled-table__label util-a-top-center'}>Type:</div>
            <div className={'cmp-labeled-table__value'}>
              Derived (overrides) | Standalone (schema)
            </div>
          </div>*/}

            <div className={'cmp-labeled-table'}>
              {schemas.map(schemaName => {
                if (schemaName === undefined) return undefined;

                const schema = $d.document.schemas.get(schemaName!);

                return (
                  <React.Fragment key={schema.id}>
                    <Collapsible label={schema.name} isOpen={true}>
                      {schema.fields.map(f => {
                        const v = unique(
                          $d.selectionState.elements.map(e => {
                            return e.renderProps.data?.data?.find(d => d.schema === schemaName)
                              ?.data[f.id];
                          })
                        );

                        return (
                          <React.Fragment key={f.id}>
                            <div className={'cmp-labeled-table__label util-a-top-center'}>
                              {f.name}:
                            </div>
                            <div className={'cmp-labeled-table__value cmp-text-input'}>
                              {f.type === 'text' && (
                                <input
                                  type={'text'}
                                  value={v.length > 1 ? '***' : v[0] ?? ''}
                                  onChange={e => changeCallback('data', schemaName, f.id, e)}
                                />
                              )}
                              {f.type === 'longtext' && (
                                <textarea
                                  style={{ height: '40px' }}
                                  value={v.length > 1 ? '***' : v[0] ?? ''}
                                  onChange={e => changeCallback('data', schemaName, f.id, e)}
                                />
                              )}
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </Collapsible>
                    <br />
                  </React.Fragment>
                );
              })}

              <Collapsible label={'Custom data'} isOpen={true}>
                {customDataKeys.map(k => {
                  const v = unique(
                    $d.selectionState.elements.map(e => {
                      return e.renderProps.data?.customData?.[k]?.toString();
                    })
                  );

                  return (
                    <React.Fragment key={k}>
                      <div className={'cmp-labeled-table__label util-a-top-center'}>{k}:</div>
                      <div className={'cmp-labeled-table__value cmp-text-input'}>
                        <textarea
                          style={{ height: '40px' }}
                          value={v.length > 1 ? '***' : v[0] ?? ''}
                          onChange={e => changeCallback('custom', '', k, e)}
                        />
                      </div>
                    </React.Fragment>
                  );
                })}
              </Collapsible>
              <br />
            </div>
          </AccordionContent>
        </Accordion.Item>
      </Accordion.Root>

      <MessageDialog
        {...confirmDeleteDialog}
        onClose={() => setConfirmDeleteDialog(MessageDialog.INITIAL_STATE)}
      />

      <JSONDialog<DataSchema>
        title={'Modify schema'}
        label={'Schema'}
        isOpen={modifyDialog !== undefined}
        onClose={() => {
          setModifyDialog(undefined);
        }}
        data={modifyDialog}
        onModify={s => {
          const schemas = $d.document.schemas;
          const isNew = schemas.get(s.id).id === '';
          if (isNew) {
            $d.undoManager.addAndExecute(new AddSchemaUndoableAction($d, s));
          } else {
            $d.undoManager.addAndExecute(new ModifySchemaUndoableAction($d, s));
          }
          redraw();
        }}
      />
    </>
  );
};
