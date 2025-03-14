import { Application } from '../../application';
import { assert } from '@diagram-craft/utils/assert';
import { DiagramElement } from '@diagram-craft/model/diagramElement';
import { UnitOfWork } from '@diagram-craft/model/unitOfWork';
import { commitWithUndo } from '@diagram-craft/model/diagramUndoActions';
import {
  AbstractSelectionAction,
  ElementType,
  MultipleType
} from '@diagram-craft/canvas-app/actions/abstractSelectionAction';
import { DataSchema } from '@diagram-craft/model/diagramDocumentDataSchemas';
import { getExternalDataStatus } from '@diagram-craft/model/externalDataHelpers';
import { DataTemplate } from '@diagram-craft/model/diagramDocument';
import { newid } from '@diagram-craft/utils/id';
import { serializeDiagramElement } from '@diagram-craft/model/serialization/serialize';
import { AbstractAction } from '@diagram-craft/canvas/action';
import { makeUndoableAction } from '@diagram-craft/model/undoManager';
import { deepClone } from '@diagram-craft/utils/object';

export const externalDataActions = (application: Application) => ({
  EXTERNAL_DATA_UNLINK: new ExternalDataUnlinkAction(application),
  EXTERNAL_DATA_MAKE_TEMPLATE: new ExternalDataMakeTemplateAction(application),
  EXTERNAL_DATA_LINK: new ExternalDataLinkAction(application),
  EXTERNAL_DATA_CLEAR: new ExternalDataClear(application),
  EXTERNAL_DATA_LINK_REMOVE_TEMPLATE: new ExternalDataLinkRemoveTemplate(application),
  EXTERNAL_DATA_LINK_RENAME_TEMPLATE: new ExternalDataLinkRenameTemplate(application)
});

declare global {
  interface ActionMap extends ReturnType<typeof externalDataActions> {}
}

type SchemaArg = { schemaId: string };

export class ExternalDataUnlinkAction extends AbstractSelectionAction<Application, SchemaArg> {
  constructor(application: Application) {
    super(application, MultipleType.SingleOnly, ElementType.Both);
  }

  isEnabled(arg: Partial<SchemaArg>): boolean {
    return (
      super.isEnabled(arg) &&
      getExternalDataStatus(
        this.context.model.activeDiagram.selectionState.elements[0],
        arg.schemaId!
      ) == 'linked'
    );
  }
  execute(arg: Partial<SchemaArg>): void {
    const elements = this.context.model.activeDiagram.selectionState.elements;
    assert.arrayNotEmpty(elements as DiagramElement[]);

    const $d = elements[0].diagram;
    const uow = new UnitOfWork($d, true);

    for (const e of elements) {
      e.updateMetadata(p => {
        p.data ??= { data: [] };
        const item = p.data.data!.find(d => d.type === 'external' && d.schema === arg.schemaId);
        assert.present(item);
        item.external = undefined;
        item.type = 'schema';
      }, uow);
    }

    commitWithUndo(uow, 'Break external data link');
  }
}

export class ExternalDataClear extends AbstractSelectionAction<Application, SchemaArg> {
  constructor(application: Application) {
    super(application, MultipleType.SingleOnly, ElementType.Both);
  }

  isEnabled(arg: Partial<SchemaArg>): boolean {
    return (
      super.isEnabled(arg) &&
      getExternalDataStatus(
        this.context.model.activeDiagram.selectionState.elements[0],
        arg.schemaId!
      ) == 'linked'
    );
  }
  execute(arg: Partial<SchemaArg>): void {
    const elements = this.context.model.activeDiagram.selectionState.elements;
    assert.arrayNotEmpty(elements as DiagramElement[]);

    const $d = elements[0].diagram;
    const uow = new UnitOfWork($d, true);

    for (const e of elements) {
      e.updateMetadata(p => {
        p.data!.data ??= [];
        p.data!.data = p.data!.data!.filter(s => s.schema !== arg.schemaId);
      }, uow);
    }

    commitWithUndo(uow, 'Break external data link');
  }
}

export type ExternalDataLinkActionProps = {
  schema: DataSchema;
};

export class ExternalDataLinkAction extends AbstractSelectionAction<Application, SchemaArg> {
  constructor(application: Application) {
    super(application, MultipleType.SingleOnly, ElementType.Both);
  }

  isEnabled(arg: Partial<SchemaArg>): boolean {
    return (
      super.isEnabled(arg) &&
      getExternalDataStatus(
        this.context.model.activeDiagram.selectionState.elements[0],
        arg.schemaId!
      ) !== 'linked'
    );
  }

  execute(arg: Partial<SchemaArg>): void {
    this.context.ui.showDialog({
      id: 'externalDataLink',
      onCancel: () => {},
      onOk: (v: string) => {
        const $d = this.context.model.activeDiagram;
        const uow = new UnitOfWork($d, true);
        $d.selectionState.elements.forEach(e => {
          e.updateMetadata(p => {
            p.data ??= { data: [] };

            let item = p.data.data!.find(d => d.schema === arg.schemaId);
            const existing = item !== undefined;
            if (!existing) {
              item = {
                schema: arg.schemaId!,
                type: 'schema',
                data: {
                  _uid: v,
                  _schemaId: arg.schemaId!
                },
                external: {
                  uid: v
                },
                enabled: true
              };
              p.data.data!.push(item);
            }
            assert.present(item);

            item.external = {
              uid: v
            };
            item.type = 'external';

            const [data] = $d.document.data.provider!.getById([v]);
            for (const k of Object.keys(data)) {
              if (k.startsWith('_')) continue;
              item.data[k] = data[k];
            }
          }, uow);
        });
        commitWithUndo(uow, 'Link external data');
      },
      props: {
        schema: this.context.model.activeDocument.data.schemas.get(arg.schemaId!)!
      }
    });
  }
}

export class ExternalDataMakeTemplateAction extends AbstractSelectionAction<
  Application,
  SchemaArg
> {
  constructor(application: Application) {
    super(application, MultipleType.SingleOnly, ElementType.Both);
  }

  isEnabled(arg: Partial<SchemaArg>): boolean {
    return (
      super.isEnabled(arg) &&
      getExternalDataStatus(
        this.context.model.activeDiagram.selectionState.elements[0],
        arg.schemaId!
      ) === 'linked'
    );
  }

  execute(arg: Partial<SchemaArg>): void {
    this.context.ui.showDialog({
      id: 'stringInput',
      props: {
        value: '',
        title: 'Template name',
        label: 'Name',
        saveButtonLabel: 'Create',
        type: 'string'
      },
      onCancel: () => {},
      onOk: (v: string) => {
        const template: DataTemplate = {
          id: newid(),
          schemaId: arg.schemaId!,
          name: v,
          template: serializeDiagramElement(
            this.context.model.activeDiagram.selectionState.elements[0]
          )
        };

        const $d = this.context.model.activeDiagram;
        const $doc = this.context.model.activeDocument;
        $d.undoManager.addAndExecute(
          makeUndoableAction('Create template', {
            redo: () => $doc.data.templates.add(template),
            undo: () => $doc.data.templates.remove(template.id)
          })
        );
      }
    });
  }
}

export class ExternalDataLinkRemoveTemplate extends AbstractAction<
  { templateId: string },
  Application
> {
  execute(arg: Partial<{ templateId: string }>): void {
    const $d = this.context.model.activeDiagram;
    const $doc = this.context.model.activeDocument;

    const template = $doc.data.templates.byId(arg.templateId!);
    assert.present(template);

    $d.undoManager.addAndExecute(
      makeUndoableAction('Remove template', {
        redo: () => $doc.data.templates.remove(arg.templateId!),
        undo: () => $doc.data.templates.add(template)
      })
    );
  }
}

export class ExternalDataLinkRenameTemplate extends AbstractAction<
  { templateId: string },
  Application
> {
  execute(arg: Partial<{ templateId: string }>): void {
    const $d = this.context.model.activeDiagram;
    const $doc = this.context.model.activeDocument;

    const template = $doc.data.templates.byId(arg.templateId!);
    assert.present(template);

    const oldTemplate = deepClone(template);

    this.context.ui.showDialog({
      id: 'stringInput',
      props: {
        value: template.name ?? '',
        title: 'Rename template',
        label: 'Name',
        saveButtonLabel: 'Rename',
        type: 'string'
      },
      onCancel: () => {},
      onOk: (v: string) => {
        template.name = v;

        $d.undoManager.addAndExecute(
          makeUndoableAction('Rename template', {
            redo: () => $doc.data.templates.update(template),
            undo: () => $doc.data.templates.update(oldTemplate)
          })
        );
      }
    });
  }
}
