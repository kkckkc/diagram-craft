import { EditableDiagram } from '../../model-editor/editable-diagram.ts';
import { AbstractSelectionAction } from './abstractSelectionAction.ts';
import { EventEmitter } from '../../utils/event.ts';
import { Action, ActionContext, ActionEvents } from '../keyMap.ts';
import {
  deserializeDiagramElements,
  SerializedElement,
  serializeDiagramElement
} from '../../model-viewer/serialization.ts';
import { newid } from '../../utils/id.ts';
import { Box } from '../../geometry/box.ts';

declare global {
  interface ActionMap {
    CLIPBOARD_COPY: ClipboardCopyAction;
    CLIPBOARD_PASTE: ClipboardPasteAction;
    CLIPBOARD_CUT: ClipboardCopyAction;
  }
}

abstract class AbstractClipboardPasteAction extends EventEmitter<ActionEvents> implements Action {
  enabled = true;

  protected constructor(protected readonly diagram: EditableDiagram) {
    super();
  }

  abstract execute(context: ActionContext): void;

  protected pasteElements(
    elements: SerializedElement[],
    context: ActionContext,
    pasteCount: number
  ) {
    const nodeIdMapping = new Map<string, string>();
    for (const e of elements) {
      if (e.type === 'node') {
        const newId = newid();
        nodeIdMapping.set(e.id, newId);
        e.id = newId;

        if (context.point) {
          console.log('moving at cursor not implemented yet');
        } else {
          const s = Box.asMutableSnapshot(e.bounds);
          s.set('pos', {
            x: s.get('pos')!.x + (pasteCount + 1) * 10,
            y: s.get('pos')!.y + (pasteCount + 1) * 10
          });
          e.bounds = s.getSnapshot();
        }
      }
    }

    for (const e of elements) {
      if (e.type === 'edge') {
        if ('node' in e.start) {
          e.start.node = { id: nodeIdMapping.get(e.start.node.id)! };
        }
        if ('node' in e.end) {
          e.end.node = { id: nodeIdMapping.get(e.end.node.id)! };
        }
      }
    }

    const newElements = deserializeDiagramElements(elements, {}, {});
    for (const e of newElements) {
      if (e.type === 'node') {
        this.diagram.addNode(e);
      } else if (e.type === 'edge') {
        this.diagram.addEdge(e);
      }
    }
  }

  protected pasteText(content: string, context: ActionContext, pasteCount: number) {
    console.log('paste text not implemented yet', content, context, pasteCount);
  }
}

export class ClipboardPasteAction extends AbstractClipboardPasteAction {
  #lastPasteHash?: string;
  #lastPasteCount = 0;

  constructor(protected readonly diagram: EditableDiagram) {
    super(diagram);
  }

  execute(context: ActionContext) {
    const $clipboard: HTMLTextAreaElement = document.getElementById(
      'clipboard'
    )! as HTMLTextAreaElement;
    $clipboard.value = '';
    $clipboard?.focus();

    document.execCommand('paste');

    window.setTimeout(() => {
      const content = $clipboard.value;

      if (content === this.#lastPasteHash) {
        this.#lastPasteCount++;
      } else {
        this.#lastPasteHash = content;
        this.#lastPasteCount = 0;
      }

      if (content.startsWith('application/x-diagram-craft-selection;')) {
        const elements = JSON.parse(
          content.substring('application/x-diagram-craft-selection;'.length)
        );
        this.pasteElements(elements, context, this.#lastPasteCount);
      } else {
        this.pasteText(content, context, this.#lastPasteCount);
      }
    }, 10);

    this.emit('actiontriggered', { action: this });
  }
}

export class ClipboardCopyAction extends AbstractSelectionAction {
  enabled = true;

  constructor(
    protected readonly diagram: EditableDiagram,
    private readonly mode: 'copy' | 'cut'
  ) {
    super(diagram);
  }

  execute(): void {
    const $clipboard: HTMLTextAreaElement = document.getElementById(
      'clipboard'
    )! as HTMLTextAreaElement;
    $clipboard.value =
      'application/x-diagram-craft-selection;' +
      JSON.stringify(this.diagram.selectionState.elements.map(e => serializeDiagramElement(e)));
    $clipboard?.focus();
    $clipboard?.select();

    document.execCommand(this.mode);

    if (this.mode === 'cut') {
      this.deleteSelection();
    }

    this.emit('actiontriggered', { action: this });
  }

  private deleteSelection() {
    for (const element of this.diagram.selectionState.elements) {
      if (element.type === 'node') {
        this.diagram.removeNode(element);
      } else if (element.type === 'edge') {
        this.diagram.removeEdge(element);
      }
    }
    this.diagram.selectionState.clear();
  }
}
