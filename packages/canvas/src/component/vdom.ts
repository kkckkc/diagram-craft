import { VerifyNotReached } from '@diagram-craft/utils/assert';

const toKebabCase = (key: string) =>
  key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();

export const toInlineCSS = (style: Partial<CSSStyleDeclaration>) => {
  return Object.entries(style!)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${toKebabCase(key)}: ${value}`)
    .join(';');
};

type EventListenerMap = {
  [K in keyof HTMLElementEventMap]?: (this: Document, ev: DocumentEventMap[K]) => unknown;
};

export interface VNodeData extends Record<string, unknown> {
  on?: Partial<EventListenerMap>;
  hooks?: {
    onUpdate?: (oldVNode: VNode, newVNode: VNode) => void;
    onInsert?: (node: VNode) => void;
    onChildrenChanged?: (node: VNode) => void;
    onCreate?: (node: VNode) => void;
    onRemove?: (node: VNode) => void;
  };
}

export type DOMElement = HTMLElement | SVGElement;

export type VNode =
  | {
      type: 'h' | 's' | 'c';
      tag: string;
      data: VNodeData;
      children: Array<VNode>;
      el: DOMElement | undefined;
    }
  | {
      type: 't';
      tag: '#text';
      data: VNodeData;
      children: [string];
      el: Text | undefined;
    }
  | {
      type: 'r';
      tag: '#raw';
      data: VNodeData;
      children: [string];
      el: DOMElement | undefined;
    };

export type VNodeChildParam = VNode | null | undefined | false;

const emptyVNode = (): VNode => ({
  type: 'h',
  tag: '',
  data: {},
  children: [],
  el: undefined
});

export const h = (tag: string, props: VNodeData, ...children: VNodeChildParam[]): VNode => {
  return {
    type: 'h',
    tag,
    data: props,
    children: children.filter(Boolean) as VNode[],
    el: undefined
  };
};

export const s = (
  tag: string,
  props: VNodeData,
  ...children: VNodeChildParam[]
): VNode & { type: 's' } => {
  return {
    type: 's',
    tag,
    data: props,
    children: children.filter(Boolean) as VNode[],
    el: undefined
  };
};

export const text = (text: string): VNode => {
  return { type: 't', tag: '#text', data: {}, children: [text], el: undefined };
};

export const rawHTML = (text: string): VNode => {
  return { type: 'r', tag: '#raw', data: {}, children: [text], el: undefined };
};

// Note: this is used as a performance optimization to avoid parsing
//       HTML every time a raw HTML node is updated
const elCache = new WeakMap<HTMLElement, string>();

const onUpdate = (oldVNode: VNode, newVNode: VNode, parentElement: VNode | undefined) => {
  updateAttrs(oldVNode, newVNode);
  updateEvents(oldVNode, newVNode);

  if (newVNode.type === 't' || newVNode.type === 'r') {
    // TODO: Checking for contentEditable here is a bit of a hack
    //       It's because for some reason blur events from TextComponent is handled out of order
    if (!parentElement || (parentElement.el! as HTMLElement).contentEditable === 'true') {
      return;
    }

    if (newVNode.type === 't') {
      (parentElement.el! as HTMLElement).innerText = newVNode.children[0];
    } else if (newVNode.type === 'r') {
      const prev = elCache.get(parentElement.el! as HTMLElement);
      if (prev === newVNode.children[0]) return;
      (parentElement.el! as HTMLElement).innerHTML = newVNode.children[0];
      elCache.set(parentElement.el! as HTMLElement, newVNode.children[0]);
    }
  }

  newVNode.data.hooks?.onUpdate?.(oldVNode, newVNode);
};

const onInsert = (node: VNode) => {
  node.data.hooks?.onInsert?.(node);
};

const onChildrenChanged = (node: VNode) => {
  node.data.hooks?.onChildrenChanged?.(node);
};

const onCreate = (node: VNode) => {
  node.data.hooks?.onCreate?.(node);
};

const onRemove = (node: VNode) => {
  for (const child of node.children) {
    if (typeof child === 'string') continue;
    onRemove(child as VNode);
  }

  node.data.hooks?.onRemove?.(node);
};

const updateAttrs = (oldVNode: VNode, newVNode: VNode) => {
  if (oldVNode.type === 't' || newVNode.type === 't') return;

  const oldAttrs = oldVNode.data ?? {};
  const newAttrs = newVNode.data ?? {};
  const newNode = newVNode.el! as DOMElement;

  Object.entries(newAttrs).forEach(([key, value]) => {
    if (key === 'on' || key === 'hooks' || key === 'component') return;
    if (oldAttrs[key] !== value) {
      newNode.setAttribute(key, value as string);
    }
  });
};

const updateEvents = (oldVNode: VNode, newVNode: VNode) => {
  if (oldVNode.type === 't' || newVNode.type === 't') return;

  const oldEvents = oldVNode.data.on ?? {};
  const newEvents = newVNode.data.on ?? {};
  const newNode = newVNode.el! as DOMElement;
  const oldNode = oldVNode.el! as DOMElement;

  Object.entries(oldEvents).forEach(([key, value]) => {
    oldNode.removeEventListener(key, value! as EventListener);
  });

  Object.entries(newEvents).forEach(([key, value]) => {
    //if (oldEvents[key as keyof EventListenerMap] !== value) {
    newNode.addEventListener(key, value as EventListener);
    //}
  });
};

const createElement = (e: VNode, parentElement: VNode | undefined, insertQueue: VNode[]) => {
  insertQueue.push(e);

  if (e.type === 't') {
    e.el = document.createTextNode(e.children[0] as string);
    onCreate(e);
  } else if (e.type === 'r') {
    (parentElement!.el as HTMLElement).innerHTML = e.children[0] as string;

    // NOTE: Not very elegant
    e.el = parentElement!.el! as DOMElement;
    onCreate(e);
  } else if (e.type === 'c') {
    onCreate(e);
  } else {
    const node =
      e.type === 'h'
        ? document.createElement(e.tag)
        : document.createElementNS('http://www.w3.org/2000/svg', e.tag);

    e.el = node;

    onCreate(e);
    onUpdate(emptyVNode(), e, undefined);

    e.children.forEach(child => {
      createElement(child as VNode, e, insertQueue);
      if ((child as VNode).type !== 'r') node.appendChild((child as VNode).el!);
    });
  }
};

const applyUpdates = (
  oldElement: VNode,
  newElement: VNode,
  parentElement: VNode | undefined,
  insertQueue: VNode[],
  childChangedQueue: VNode[]
): VNode => {
  newElement.el ??= oldElement.el;

  // Diff props
  onUpdate(oldElement, newElement, parentElement);

  if (oldElement.type === 't' || oldElement.type === 'r') {
    if (newElement.type !== oldElement.type) throw new VerifyNotReached();
    return newElement;
  }

  if (newElement.type === 't' || newElement.type === 'r') {
    throw new VerifyNotReached();
  }

  // Diff children
  const oldChildren = oldElement.children;
  const newChildren = newElement.children as VNode[];

  let childrenChanged = false;

  // Diff this.elements and newElements
  // TODO: This is a bit of a naive algorithm, as it doesn't try to match elements properly
  let i = 0;
  let j = 0;
  while (i < newChildren.length) {
    if (j >= oldChildren.length) {
      break;
    }

    const newChild = newChildren[i];
    const oldChild = oldChildren[j];

    if (newChild === oldChild) {
      // Do nothing
    } else if (newChild.tag !== oldChild.tag) {
      // New tag name
      createElement(newChild, newElement, insertQueue);
      oldChild.el!.replaceWith(newChild.el!);

      onRemove(oldChild);
      childrenChanged = true;
    } else {
      // Only properties have changed
      newChild.el = oldChild.el;
      applyUpdates(oldChild, newChild, newElement, insertQueue, childChangedQueue);
      if (newChild.type === 'r') childrenChanged = true;
    }
    i++;
    j++;
  }

  for (; j < oldChildren.length; j++) {
    const oldChild = oldChildren[j];
    onRemove(oldChild);
    oldChild.el!.remove();
    childrenChanged = true;
  }

  for (; i < newChildren.length; i++) {
    const newChild = newChildren[i];
    createElement(newChild, newElement, insertQueue);
    if (newChild.type !== 'r') newElement.el!.appendChild(newChild.el!);
    childrenChanged = true;
  }

  if (childrenChanged) {
    childChangedQueue.push(newElement);
  }

  return newElement;
};

export const apply = (oldElement: VNode, newElement: VNode) => {
  const insertQueue: VNode[] = [];
  const childChangedQueue: VNode[] = [];
  // TODO: Support replacing root element in case tag name has changed
  const newRoot = applyUpdates(oldElement, newElement, undefined, insertQueue, childChangedQueue);
  // TODO: Not sure if queueMicrotask is the best way to do this
  queueMicrotask(() => {
    insertQueue.forEach(onInsert);
  });
  queueMicrotask(() => {
    childChangedQueue.forEach(onChildrenChanged);
  });
  return newRoot;
};

export const insert = (newElement: VNode) => {
  const insertQueue: VNode[] = [];
  createElement(newElement, undefined, insertQueue);
  queueMicrotask(() => {
    insertQueue.forEach(onInsert);
  });
  return newElement;
};
