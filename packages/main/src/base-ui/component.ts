import { apply, DOMElement, insert, VNode, VNodeData } from './vdom.ts';

type Dependency = () => () => void;

type Registration = {
  cleanup: () => void;
  deps: unknown[];
};

export class PropChangeManager {
  private dependencies: Record<string, Registration> = {};

  when(deps: unknown[], id: string, dependency: Dependency) {
    if (
      id in this.dependencies &&
      this.dependencies[id].deps.length > 0 &&
      deps.every((d, i) => d === this.dependencies[id].deps[i])
    ) {
      return;
    }

    if (id in this.dependencies) {
      this.dependencies[id].cleanup();
    }

    this.dependencies[id] = {
      cleanup: dependency(),
      deps
    };
  }

  cleanup() {
    for (const id in this.dependencies) {
      this.dependencies[id].cleanup();
    }
  }
}

type ComponentVNodeData<P, C extends Component<P>> = VNodeData & {
  component: {
    instance: C | undefined;
    props: P;
  };
};

export abstract class Component<P = Record<string, never>> {
  protected element: VNode | undefined = undefined;
  protected currentProps: P | undefined;

  abstract render(props: P): VNode;

  onDetach() {}
  onAttach() {}

  detach() {
    this.onDetach();
    if (this.element?.el) this.element.el.remove();
  }

  attach(parent: HTMLElement | SVGElement, props: P) {
    this.create(props);
    parent.appendChild(this.element!.el! as DOMElement);
    this.onAttach();
  }

  protected create(props: P) {
    const newElement = this.render(props);

    insert(newElement);

    this.element = newElement;
    this.currentProps = props;
  }

  redraw() {
    if (!this.element) return;
    this.update(this.currentProps!);
  }

  update(props: P) {
    this.element = apply(this.element!, this.render(props));
    this.currentProps = props;
  }

  isRendered(): boolean {
    return !!this.element?.el;
  }

  replaceWith(newComponent: Component<P>) {
    if (this.element?.el) {
      newComponent.create(this.currentProps!);
      this.element.el.replaceWith(newComponent.element!.el!);
      this.detach();
    }
  }

  protected subComponent<P, C extends Component<P>>(
    id: string,
    component: () => C,
    props: P
  ): VNode & { data: ComponentVNodeData<P, C> } {
    return {
      type: 'c',
      tag: id,
      data: {
        component: {
          props,
          instance: undefined
        },
        hooks: {
          onInsert: node => {
            (node.data as ComponentVNodeData<P, C>).component?.instance?.onAttach();
          },
          onCreate: node => {
            const cmp = component();
            cmp.create(props);
            node.el = cmp.element?.el;
            (node.data as ComponentVNodeData<P, C>).component = {
              instance: cmp,
              props: props
            };
          },
          onUpdate: (oldNode, newNode) => {
            const cmp = (oldNode.data as ComponentVNodeData<P, C>).component.instance!;
            cmp.update((newNode.data as ComponentVNodeData<P, C>).component.props);
            newNode.el = cmp.element?.el;
            (newNode.data as ComponentVNodeData<P, C>).component = {
              instance: cmp,
              props: props
            };
          },
          onRemove: node => {
            const cmp = (node.data as ComponentVNodeData<P, C>).component.instance!;
            cmp.detach();
          }
        }
      },
      children: [],
      el: undefined
    };
  }
}