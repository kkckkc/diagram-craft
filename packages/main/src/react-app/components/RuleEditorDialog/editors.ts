import { EditorRegistry } from '@diagram-craft/canvas-app/PropsEditor';
import { ReactElement } from 'react';
import { DynamicAccessor, PropPath, PropPathValue } from '@diagram-craft/utils/propertyPath';
import { Property } from '../../toolwindow/ObjectToolWindow/types';
import { NodeFillEditor } from './NodeFillEditor';
import { NodeStrokeEditor } from './NodeStrokeEditor';
import { ElementShadowEditor } from './ElementShadowEditor';
import { DeepReadonly } from '@diagram-craft/utils/types';
import { NodeEffectsEditor } from './NodeEffectsEditor';
import { NodeTextEditor } from './NodeTextEditor';

export type Editor = (props: {
  props: NodeProps | EdgeProps;
  onChange: () => void;
}) => ReactElement;

export type EditorTypes = 'node' | 'edge';

export const NODE_EDITORS: EditorRegistry<Editor> = {
  fill: {
    name: 'Fill',
    editor: NodeFillEditor,
    pick: (props: NodeProps | EdgeProps) => ({ fill: props.fill })
  },
  stroke: {
    name: 'Stroke',
    editor: NodeStrokeEditor,
    pick: (props: NodeProps | EdgeProps) => ({ stroke: props.stroke })
  },
  shadow: {
    name: 'Shadow',
    editor: ElementShadowEditor,
    pick: (props: NodeProps | EdgeProps) => ({ shadow: props.shadow })
  },
  effects: {
    name: 'Effects',
    editor: NodeEffectsEditor,
    pick: (props: NodeProps | EdgeProps) => ({ effects: props.effects })
  },
  text: {
    name: 'Text',
    editor: NodeTextEditor,
    pick: (props: NodeProps | EdgeProps) => ({ text: (props as NodeProps).text })
  }
};

export const EDGE_EDITORS: EditorRegistry<Editor> = {
  shadow: {
    name: 'Shadow',
    editor: ElementShadowEditor,
    pick: (props: NodeProps | EdgeProps) => ({ shadow: props.shadow })
  }
};

export function makeProperty<
  TObj,
  K extends PropPath<TObj | DeepReadonly<TObj>>,
  V extends PropPathValue<TObj | DeepReadonly<TObj>, K>
>(
  obj: TObj,
  propertyPath: PropPath<TObj | DeepReadonly<TObj>>,
  defaults: TObj | DeepReadonly<TObj>,
  onChange: (v: V) => void
): Property<V> {
  const accessor = new DynamicAccessor<TObj | DeepReadonly<TObj>>();
  return {
    val: (accessor.get(obj, propertyPath) as V) ?? (accessor.get(defaults, propertyPath) as V),
    set: (v: V) => {
      accessor.set(obj, propertyPath, v);
      onChange(v);
    },
    hasMultipleValues: false
  } as Property<V>;
}