import { EditableDiagram } from '../../model-editor/editable-diagram.ts';
import { AbstractSelectionAction } from './abstractSelectionAction.ts';
import { EventEmitter } from '../../utils/event.ts';
import { Action, ActionContext, ActionEvents } from '../keyMap.ts';
import {
  deserializeDiagramElements,
  isConnected,
  SerializedElement,
  serializeDiagramElement
} from '../../model-viewer/serialization.ts';
import { newid } from '../../utils/id.ts';
import { Box } from '../../geometry/box.ts';
import { DiagramElement } from '../../model-viewer/diagramNode.ts';
import { Point } from '../../geometry/point.ts';
import { UndoableAction } from '../../model-editor/undoManager.ts';
import { Diagram } from '../../model-viewer/diagram.ts';
import { precondition } from '../../utils/assert.ts';

declare global {
  interface ActionMap {
    CLIPBOARD_COPY: ClipboardCopyAction;
    CLIPBOARD_PASTE: ClipboardPasteAction;
    CLIPBOARD_CUT: ClipboardCopyAction;
  }
}

const OFFSET = 10;
const PREFIX = 'application/x-diagram-craft-selection;';

export class PasteUndoableAction implements UndoableAction {
  description = 'Paste';

  constructor(
    private readonly elements: DiagramElement[],
    private readonly diagram: Diagram
  ) {}

  undo() {
    this.elements.forEach(e => {
      this.diagram.removeElement(e);
    });
  }

  redo() {
    this.elements.forEach(e => {
      this.diagram.addElement(e);
    });
  }
}

abstract class AbstractClipboardPasteAction extends EventEmitter<ActionEvents> implements Action {
  enabled = true;

  protected constructor(protected readonly diagram: EditableDiagram) {
    super();
  }

  abstract execute(context: ActionContext): void;

  protected pasteElements(elements: SerializedElement[], context: ActionContext): Point {
    const nodeIdMapping = new Map<string, string>();

    const bb = Box.boundingBox(
      elements.map(e => {
        if (e.type === 'node') return e.bounds;
        else {
          precondition.is.present(e.start.position);
          precondition.is.present(e.end.position);
          return Box.fromCorners(e.start.position, e.end.position);
        }
      })
    );

    if (!context.point) {
      context.point = { x: bb.pos.x + OFFSET, y: bb.pos.y + OFFSET };
    }

    for (const e of elements) {
      if (e.type === 'node') {
        const newId = newid();
        nodeIdMapping.set(e.id, newId);
        e.id = newId;

        const s = Box.asMutableSnapshot(e.bounds);
        s.set('pos', this.adjustPosition(s.get('pos'), context, bb));
        e.bounds = s.getSnapshot();
      } else {
        e.id = newid();
        if (!isConnected(e.start)) {
          e.start.position = this.adjustPosition(e.start.position, context, bb);
        }
        if (!isConnected(e.end)) {
          e.end.position = this.adjustPosition(e.end.position, context, bb);
        }
      }
    }

    for (const e of elements) {
      if (e.type === 'edge') {
        if ('node' in e.start) {
          const newId = nodeIdMapping.get(e.start.node.id);
          if (newId) {
            e.start.node = { id: newId };
          } else {
            e.start = { position: e.start.position! };
          }
        }
        if ('node' in e.end) {
          const newId = nodeIdMapping.get(e.end.node.id);
          if (newId) {
            e.end.node = { id: newId };
          } else {
            e.end = { position: e.end.position! };
          }
        }
      }
    }

    const newElements = deserializeDiagramElements(elements, {}, {});

    this.diagram.undoManager.addAndExecute(new PasteUndoableAction(newElements, this.diagram));
    this.diagram.selectionState.setElements(newElements, true);

    return context.point;
  }

  private adjustPosition(s: Point, context: ActionContext, bb: Box) {
    return {
      x: s.x + (context.point!.x - bb.pos.x),
      y: s.y + (context.point!.y - bb.pos.y)
    };
  }

  protected pasteText(content: string, context: ActionContext): Point {
    console.log('paste text not implemented yet "', content, '"', context);

    return context.point!;
  }
}

export class ClipboardPasteAction extends AbstractClipboardPasteAction {
  #lastPasteHash?: string;
  #lastPastePoint: Point | undefined = undefined;

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
      let content = $clipboard.value;

      if (content.trim() === '') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content = (document.body as any)._diagramCraftClipboard;
      }

      if (content === this.#lastPasteHash) {
        this.#lastPastePoint = {
          x: this.#lastPastePoint!.x + OFFSET,
          y: this.#lastPastePoint!.y + OFFSET
        };
      } else {
        this.#lastPasteHash = content;
        this.#lastPastePoint = undefined;
      }

      if (content.startsWith(PREFIX)) {
        const elements = JSON.parse(content.substring(PREFIX.length));
        this.#lastPastePoint = this.pasteElements(elements, {
          point: this.#lastPastePoint,
          ...context
        });
      } else {
        this.#lastPastePoint = this.pasteText(content, { point: this.#lastPastePoint, ...context });
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (document.body as any)._diagramCraftClipboard = $clipboard.value;

    if (this.mode === 'cut') {
      this.deleteSelection();
    }

    this.emit('actiontriggered', { action: this });
  }

  private deleteSelection() {
    for (const element of this.diagram.selectionState.elements) {
      this.diagram.removeElement(element);
    }
    this.diagram.selectionState.clear();
  }
}