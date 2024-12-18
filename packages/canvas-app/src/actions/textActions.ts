import { AbstractToggleAction, ActionContext, ActionCriteria } from '@diagram-craft/canvas/action';
import { UnitOfWork } from '@diagram-craft/model/unitOfWork';
import { commitWithUndo } from '@diagram-craft/model/diagramUndoActions';
import { Application } from '../application';
import { StringInputDialogCommand } from '../dialogs';
import { AbstractSelectionAction, ElementType, MultipleType } from './abstractSelectionAction';

declare global {
  interface ActionMap extends ReturnType<typeof textActions> {}
}

export const textActions = (context: Application) => ({
  TEXT_BOLD: new TextAction('bold', context),
  TEXT_ITALIC: new TextAction('italic', context),
  TEXT_UNDERLINE: new TextDecorationAction('underline', context),
  TEXT_EDIT: new TextEditAction(context)
});

// TODO: Maybe we can create an AbstractPropertyAction that takes a prop name and a value and
//       to make all of this a bit more streamlined

export class TextAction extends AbstractToggleAction {
  constructor(
    private readonly prop: 'bold' | 'italic',
    context: ActionContext
  ) {
    super(context);
  }

  getStateCriteria(context: ActionContext) {
    const $d = context.model.activeDiagram;

    const callback = () => {
      if ($d.selectionState.isNodesOnly() && $d.selectionState.nodes.length === 1) {
        const node = $d.selectionState.nodes[0];
        return !!node.renderProps.text?.[this.prop];
      }

      return false;
    };

    return [
      ActionCriteria.EventTriggered($d.selectionState, 'add', callback),
      ActionCriteria.EventTriggered($d.selectionState, 'remove', callback),
      ActionCriteria.EventTriggered($d.undoManager, 'execute', callback)
    ];

    return super.getStateCriteria(context);
  }

  getCriteria(context: ActionContext) {
    const $d = context.model.activeDiagram;

    const callback = () => {
      if ($d.selectionState.isNodesOnly() && $d.selectionState.nodes.length === 1) {
        const node = $d.selectionState.nodes[0];
        return node.nodeType === 'text';
      }

      return false;
    };
    return [
      ActionCriteria.EventTriggered($d.selectionState, 'add', callback),
      ActionCriteria.EventTriggered($d.selectionState, 'remove', callback),
      ActionCriteria.EventTriggered($d.undoManager, 'execute', callback)
    ];
  }

  execute(): void {
    const node = this.context.model.activeDiagram.selectionState.nodes[0];

    const uow = new UnitOfWork(this.context.model.activeDiagram, true);

    node.updateProps(p => {
      p.text ??= {};
      p.text[this.prop] ??= false;
      p.text[this.prop] = !p.text[this.prop];
    }, uow);

    commitWithUndo(uow, `Text: ${this.prop}`);

    this.state = !!node.renderProps.text![this.prop];
    this.emit('actionChanged');
  }
}

export class TextDecorationAction extends AbstractToggleAction {
  constructor(
    private readonly prop: 'underline' | 'line-through' | 'overline',
    context: ActionContext
  ) {
    super(context);
  }

  getStateCriteria(context: ActionContext) {
    const $d = context.model.activeDiagram;
    const callback = () => {
      if ($d.selectionState.isNodesOnly() && $d.selectionState.nodes.length === 1) {
        const node = $d.selectionState.nodes[0];
        return node.renderProps.text?.textDecoration === this.prop;
      }
      return false;
    };
    return [
      ActionCriteria.EventTriggered($d.selectionState, 'add', callback),
      ActionCriteria.EventTriggered($d.selectionState, 'remove', callback),
      ActionCriteria.EventTriggered($d.undoManager, 'execute', callback)
    ];
  }

  getCriteria(context: ActionContext) {
    const $d = context.model.activeDiagram;
    const callback = () => {
      if ($d.selectionState.isNodesOnly() && $d.selectionState.nodes.length === 1) {
        const node = $d.selectionState.nodes[0];
        return node.nodeType === 'text';
      }
      return false;
    };
    return [
      ActionCriteria.EventTriggered($d.selectionState, 'add', callback),
      ActionCriteria.EventTriggered($d.selectionState, 'remove', callback),
      ActionCriteria.EventTriggered($d.undoManager, 'execute', callback)
    ];
  }

  execute(): void {
    const node = this.context.model.activeDiagram.selectionState.nodes[0];

    const uow = new UnitOfWork(this.context.model.activeDiagram, true);

    node.updateProps(p => {
      p.text ??= {};
      if (p.text.textDecoration === this.prop) {
        p.text.textDecoration = 'none';
      } else {
        p.text.textDecoration = this.prop;
      }
    }, uow);

    commitWithUndo(uow, `Text decoration`);

    this.state = node.renderProps.text!.textDecoration === this.prop;
    this.emit('actionChanged');
  }
}

export class TextEditAction extends AbstractSelectionAction<Application> {
  constructor(application: Application) {
    super(application, MultipleType.SingleOnly, ElementType.Node);
  }

  execute(): void {
    const selectedItem = this.context.model.activeDiagram.selectionState.nodes[0];
    this.context.ui.showDialog(
      new StringInputDialogCommand(
        {
          label: 'Text',
          title: 'Edit text',
          description: 'Enter a new text for the selected text.',
          value: selectedItem.texts.text,
          saveButtonLabel: 'Save',
          type: 'text'
        },
        (d: string) => {
          const uow = new UnitOfWork(selectedItem.diagram, true);
          selectedItem.setText(d, uow);
          commitWithUndo(uow, 'Edit text');
        }
      )
    );
  }
}
