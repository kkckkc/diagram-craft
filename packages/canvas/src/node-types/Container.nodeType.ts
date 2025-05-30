import { ShapeNodeDefinition } from '../shape/shapeNodeDefinition';
import { BaseNodeComponent, BaseShapeBuildShapeProps } from '../components/BaseNodeComponent';
import * as svg from '../component/vdom-svg';
import { Transforms } from '../component/vdom-svg';
import { ShapeBuilder } from '../shape/ShapeBuilder';
import { Box } from '@diagram-craft/geometry/box';
import { Point } from '@diagram-craft/geometry/point';
import { Rotation, Scale, Transform, Translation } from '@diagram-craft/geometry/transform';
import { DiagramElement, isNode } from '@diagram-craft/model/diagramElement';
import { CustomPropertyDefinition } from '@diagram-craft/model/elementDefinitionRegistry';
import { DiagramNode, NodePropsForRendering } from '@diagram-craft/model/diagramNode';
import { UnitOfWork } from '@diagram-craft/model/unitOfWork';
import { largest } from '@diagram-craft/utils/array';
import { assert } from '@diagram-craft/utils/assert';
import { registerCustomNodeDefaults } from '@diagram-craft/model/diagramDefaults';
import { hasHighlight, Highlights } from '../highlight';
import { isEnum } from '@diagram-craft/utils/types';
import { renderElement } from '../components/renderElement';

type ContainerResize = 'none' | 'shrink' | 'grow' | 'both';
function assertIsContainerResizeOrUndefined(
  value: string | undefined
): asserts value is ContainerResize | undefined {
  assert.true(value === undefined || isEnum(value, ['none', 'shrink', 'grow', 'both']));
}

type ChildResize = 'fixed' | 'scale' | 'fill';
function assertIsChildResizeOrUndefined(
  value: string | undefined
): asserts value is ChildResize | undefined {
  assert.true(value === undefined || isEnum(value, ['fixed', 'scale', 'fill']));
}

type LayoutType = 'manual' | 'horizontal' | 'vertical';
function assertIsLayoutTypeOrUndefined(
  value: string | undefined
): asserts value is LayoutType | undefined {
  assert.true(value === undefined || isEnum(value, ['manual', 'horizontal', 'vertical']));
}

type GapType = 'between' | 'around';
function assertIsGapTypeOrUndefined(
  value: string | undefined
): asserts value is GapType | undefined {
  assert.true(value === undefined || isEnum(value, ['between', 'around']));
}

declare global {
  interface CustomNodeProps {
    container?: {
      containerResize?: ContainerResize;
      childResize?: ChildResize;
      layout?: LayoutType;
      gap?: number;
      gapType?: GapType;
    };
  }
}

registerCustomNodeDefaults('container', {
  containerResize: 'none',
  childResize: 'fixed',
  layout: 'manual',
  gap: 0,
  gapType: 'between'
});

type ContainerProps = NodePropsForRendering['custom']['container'];

type Entry = {
  node: DiagramElement;
  localBounds: Box;
  newLocalBounds?: Box;
};

type LayoutFn = (
  node: DiagramNode,
  props: ContainerProps,
  children: Entry[],
  localBounds: Box
) => Box;

type Layout = {
  fn: LayoutFn;
  primaryAxis: 'x' | 'y' | undefined;
};

const horizontalLayout: LayoutFn = (
  node: DiagramNode,
  props: ContainerProps,
  children: Entry[],
  localBounds: Box
) => {
  if (children.length === 0) return localBounds;

  const fill = props.childResize === 'fill';
  const gap = props.gap;
  const gapType = props.gapType;

  // Sort children by x position
  const sortedLocalChildren = children.sort((a, b) => a.localBounds.x - b.localBounds.x);

  const maxHeight = Math.max(
    node.bounds.h,
    largest(
      sortedLocalChildren.map(c => c.localBounds.h),
      (a, b) => a - b
    )!
  );

  let x = gapType === 'around' ? gap : 0;
  for (const entry of sortedLocalChildren) {
    if (!isNode(entry.node)) continue;

    entry.newLocalBounds = {
      ...entry.localBounds,
      x,
      y: fill ? 0 : entry.localBounds.y,
      h: fill ? maxHeight : entry.localBounds.h
    };
    x += entry.newLocalBounds.w + (gapType === 'around' ? 2 : 1) * gap;
  }

  return Box.boundingBox(children.map(c => c.localBounds));
};

const verticalLayout: LayoutFn = (
  node: DiagramNode,
  props: ContainerProps,
  children: Entry[],
  localBounds: Box
) => {
  if (children.length === 0) return localBounds;

  const fill = props.childResize === 'fill';
  const gap = props.gap;
  const gapType = props.gapType;

  // Sort children by y position
  const sortedLocalChildren = children.sort((a, b) => a.localBounds.y - b.localBounds.y);

  const maxWidth = Math.max(
    node.bounds.w,
    largest(
      sortedLocalChildren.map(c => c.localBounds.w),
      (a, b) => a - b
    )!
  );

  let y = gapType === 'around' ? gap : 0;
  for (const entry of sortedLocalChildren) {
    if (!isNode(entry.node)) continue;

    entry.newLocalBounds = {
      ...entry.localBounds,
      x: fill ? 0 : entry.localBounds.x,
      y,
      w: fill ? maxWidth : entry.localBounds.w
    };
    y += entry.newLocalBounds.h + (gapType === 'around' ? 2 : 1) * gap;
  }

  return Box.boundingBox(children.map(c => c.localBounds));
};

const defaultLayout: LayoutFn = (
  _node: DiagramNode,
  props: ContainerProps,
  children: Entry[],
  localBounds: Box
) => {
  if (props.containerResize === 'shrink' || props.containerResize === 'none') return localBounds;
  if (children.length === 0) return localBounds;

  return Box.boundingBox([localBounds, ...children.map(c => c.localBounds)]);
};

const LAYOUTS: Record<string, Layout> = {
  horizontal: { fn: horizontalLayout, primaryAxis: 'x' },
  vertical: { fn: verticalLayout, primaryAxis: 'y' },
  manual: { fn: defaultLayout, primaryAxis: undefined }
};

export class ContainerNodeDefinition extends ShapeNodeDefinition {
  constructor(id = 'container', name = 'Container', component = ContainerComponent) {
    super(id, name, component);

    this.capabilities.fill = false;
    this.capabilities.children = true;
  }

  onTransform(
    transforms: ReadonlyArray<Transform>,
    node: DiagramNode,
    newBounds: Box,
    previousBounds: Box,
    uow: UnitOfWork
  ) {
    if (
      newBounds.w === previousBounds.w &&
      newBounds.h === previousBounds.h &&
      newBounds.r === previousBounds.r
    ) {
      return super.onTransform(transforms, node, newBounds, previousBounds, uow);
    }

    const isScaling = transforms.find(t => t instanceof Scale);

    const newWidth = newBounds.w;
    const newHeight = newBounds.h;
    const newTransforms: Array<Transform> = [...transforms];

    if (newWidth !== newBounds.w || newHeight !== newBounds.h) {
      node.setBounds({ ...newBounds, w: newWidth, h: newHeight }, uow);
      newTransforms.push(new Scale(newWidth / newBounds.w, newHeight / newBounds.h));
    }

    if (!isScaling || node.renderProps.custom.container.childResize !== 'fixed') {
      for (const child of node.children) {
        child.transform(newTransforms, uow, true);
      }
    }

    return this.layoutChildren(node, uow);
  }

  onDrop(
    _coord: Point,
    node: DiagramNode,
    elements: ReadonlyArray<DiagramElement>,
    uow: UnitOfWork,
    _operation: string
  ) {
    node.diagram.moveElement(elements, uow, node.layer, {
      relation: 'on',
      element: node
    });
  }

  layoutChildren(node: DiagramNode, uow: UnitOfWork) {
    // First layout all children
    super.layoutChildren(node, uow);

    this.doLayoutChildren(node.renderProps.custom.container, node, uow);
  }

  protected doLayoutChildren(props: ContainerProps, node: DiagramNode, uow: UnitOfWork) {
    const autoShrink = props.containerResize === 'shrink' || props.containerResize === 'both';
    const autoGrow = props.containerResize === 'grow' || props.containerResize === 'both';
    const gapType = node.renderProps.custom.container.gapType;

    // We need to perform all layout operations in the local coordinate system of the node

    const transformBack = [
      // Rotation around center
      new Translation({
        x: -node.bounds.x - node.bounds.w / 2,
        y: -node.bounds.y - node.bounds.h / 2
      }),
      new Rotation(-node.bounds.r),
      // Move back to 0,0
      new Translation({
        x: node.bounds.w / 2,
        y: node.bounds.h / 2
      })
    ];
    const transformForward = transformBack.map(t => t.invert()).reverse();

    const boundsBefore = node.bounds;
    const localBounds = Transform.box(boundsBefore, ...transformBack);
    assert.true(Math.abs(localBounds.r) < 0.0001);

    const children: Entry[] = node.children.map(c => ({
      node: c,
      localBounds: Transform.box(c.bounds, ...transformBack),
      newLocalBounds: undefined
    }));

    if (children.length === 0) return;

    const layout = LAYOUTS[props.layout];
    let newBounds = layout.fn(node, props, children, localBounds);

    // Shrink to minimum size, but retain the position
    let xEnd = localBounds.x + (autoShrink ? 0 : localBounds.w);
    let yEnd = localBounds.y + (autoShrink ? 0 : localBounds.h);
    if (autoGrow || autoShrink) {
      for (const entry of children) {
        const lb = entry.newLocalBounds ?? entry.localBounds;
        xEnd = Math.max(xEnd, lb.x + lb.w);
        yEnd = Math.max(yEnd, lb.y + lb.h);
      }

      if (gapType === 'around') {
        xEnd += layout.primaryAxis === 'x' ? props.gap : 0;
        yEnd += layout.primaryAxis === 'y' ? props.gap : 0;
      }
    }

    let newWidth = Math.max(xEnd - localBounds.x, 10);
    if (autoShrink && !autoGrow) newWidth = Math.min(newWidth, localBounds.w);
    if (!autoShrink && autoGrow) newWidth = Math.max(newWidth, localBounds.w);

    let newHeight = Math.max(yEnd - localBounds.y, 10);
    if (autoShrink && !autoGrow) newHeight = Math.min(newHeight, localBounds.h);
    if (!autoShrink && autoGrow) newHeight = Math.max(newHeight, localBounds.h);

    newBounds = {
      x: localBounds.x,
      y: localBounds.y,
      w: newWidth,
      h: newHeight,
      r: 0
    };

    // Transform back to global coordinate system
    node.setBounds(Transform.box(newBounds, ...transformForward), uow);
    for (const entry of children) {
      if (!entry.newLocalBounds) continue;
      if (!isNode(entry.node)) continue;

      entry.node.setBounds(Transform.box(entry.newLocalBounds, ...transformForward), uow);
    }

    // Only trigger parent.onChildChanged in case this node has indeed changed
    if (node.parent && !Box.isEqual(node.bounds, boundsBefore)) {
      if (isNode(node.parent)) {
        uow.registerOnCommitCallback('onChildChanged', node.parent, () => {
          assert.node(node.parent!);
          const parentDef = node.parent.getDefinition();
          parentDef.onChildChanged(node.parent, uow);
        });
      }
    }
  }

  getCustomPropertyDefinitions(node: DiagramNode): Array<CustomPropertyDefinition> {
    return [
      {
        id: 'containerResize',
        type: 'select',
        label: 'Container Resize',
        value: node.renderProps.custom.container.containerResize,
        options: [
          { value: 'none', label: 'None' },
          { value: 'shrink', label: 'Auto Shrink' },
          { value: 'grow', label: 'Auto Grow' },
          { value: 'both', label: 'Both' }
        ],
        isSet: node.storedProps.custom?.container?.containerResize !== undefined,
        onChange: (value: string | undefined, uow: UnitOfWork) => {
          assertIsContainerResizeOrUndefined(value);
          node.updateCustomProps('container', props => (props.containerResize = value), uow);
        }
      },
      {
        id: 'layout',
        type: 'select',
        label: 'Layout',
        value: node.renderProps.custom.container.layout,
        options: [
          { value: 'manual', label: 'Manual' },
          { value: 'horizontal', label: 'Horizontal' },
          { value: 'vertical', label: 'Vertical' }
        ],
        isSet: node.storedProps.custom?.container?.layout !== undefined,
        onChange: (value: string | undefined, uow: UnitOfWork) => {
          assertIsLayoutTypeOrUndefined(value);
          node.updateCustomProps('container', props => (props.layout = value), uow);
        }
      },
      {
        id: 'gap',
        type: 'number',
        label: 'Gap',
        value: node.renderProps.custom.container.gap,
        unit: 'px',
        isSet: node.storedProps.custom?.container?.gap !== undefined,
        onChange: (value: number | undefined, uow: UnitOfWork) => {
          node.updateCustomProps('container', props => (props.gap = value), uow);
        }
      },
      {
        id: 'gapType',
        type: 'select',
        label: 'Gap Type',
        value: node.renderProps.custom.container.gapType,
        options: [
          { value: 'between', label: 'Between' },
          { value: 'around', label: 'Around' }
        ],
        isSet: node.storedProps.custom?.container?.gapType !== undefined,
        onChange: (value: string | undefined, uow: UnitOfWork) => {
          assertIsGapTypeOrUndefined(value);
          node.updateCustomProps('container', props => (props.gapType = value), uow);
        }
      },
      {
        id: 'childResize',
        type: 'select',
        label: 'Child Resize',
        value: node.renderProps.custom.container.childResize,
        options: [
          { value: 'fixed', label: 'Fixed' },
          { value: 'scale', label: 'Scale' },
          { value: 'fill', label: 'Fill' }
        ],
        isSet: node.storedProps.custom?.container?.childResize !== undefined,
        onChange: (value: string | undefined, uow: UnitOfWork) => {
          assertIsChildResizeOrUndefined(value);
          node.updateCustomProps('container', props => (props.childResize = value), uow);
        }
      }
    ];
  }
}

export class ContainerComponent extends BaseNodeComponent {
  buildShape(props: BaseShapeBuildShapeProps, builder: ShapeBuilder) {
    const paths = new ContainerNodeDefinition().getBoundingPathBuilder(props.node).getPaths();

    const path = paths.singular();
    const svgPath = path.asSvgPath();

    builder.noBoundaryNeeded();
    builder.add(
      svg.path({
        'd': svgPath,
        'x': props.node.bounds.x,
        'y': props.node.bounds.y,
        'width': props.node.bounds.w,
        'height': props.node.bounds.h,
        'stroke': hasHighlight(props.node, Highlights.NODE__DROP_TARGET) ? '#30A46C' : '#d5d5d4',
        'stroke-width': hasHighlight(props.node, Highlights.NODE__DROP_TARGET) ? 3 : 1,
        'fill': 'transparent',
        'on': {
          mousedown: props.onMouseDown
        }
      })
    );

    props.node.children.forEach(child => {
      builder.add(
        svg.g(
          { transform: Transforms.rotateBack(props.node.bounds) },
          renderElement(this, child, props)
        )
      );
    });
  }
}
