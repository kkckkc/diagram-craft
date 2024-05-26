import { ShapeNodeDefinition } from '../shape/shapeNodeDefinition';
import { BaseNodeComponent, BaseShapeBuildShapeProps } from '../components/BaseNodeComponent';
import * as svg from '../component/vdom-svg';
import { Transforms } from '../component/vdom-svg';
import { ShapeBuilder } from '../shape/ShapeBuilder';
import { Box } from '@diagram-craft/geometry/box';
import { PathBuilder, unitCoordinateSystem } from '@diagram-craft/geometry/pathBuilder';
import { Point } from '@diagram-craft/geometry/point';
import { Rotation, Scale, Transform, Translation } from '@diagram-craft/geometry/transform';
import { DiagramElement, isNode } from '@diagram-craft/model/diagramElement';
import {
  CustomPropertyDefinition,
  NodeCapability
} from '@diagram-craft/model/elementDefinitionRegistry';
import { DiagramNode } from '@diagram-craft/model/diagramNode';
import { UnitOfWork } from '@diagram-craft/model/unitOfWork';
import { largest } from '@diagram-craft/utils/array';
import { assert } from '@diagram-craft/utils/assert';

declare global {
  interface NodeProps {
    container?: {
      containerResize?: 'none' | 'shrink' | 'grow' | 'both';
      childResize?: 'fixed' | 'scale' | 'fill';
      canResize?: 'none' | 'width' | 'height' | 'both';
      layout?: 'manual' | 'horizontal' | 'vertical';
      gap?: number;
    };
  }
}

type Entry = {
  node: DiagramElement;
  localBounds: Box;
  newLocalBounds?: Box;
};

type Layout = (node: DiagramNode, children: Entry[], localBounds: Box) => Box;

const horizontalLayout: Layout = (node: DiagramNode, children: Entry[], localBounds: Box) => {
  if (children.length === 0) return localBounds;

  const fill = node.props.container?.childResize === 'fill';
  const gap = node.props.container?.gap ?? 0;

  // Sort children by x position
  const sortedLocalChildren = children.sort((a, b) => a.localBounds.x - b.localBounds.x);

  const maxHeight = Math.max(
    node.bounds.h,
    largest(
      sortedLocalChildren.map(c => c.localBounds.h),
      (a, b) => a - b
    )!
  );

  let x = 0;
  for (const entry of sortedLocalChildren) {
    if (!isNode(entry.node)) continue;

    entry.newLocalBounds = {
      ...entry.localBounds,
      x,
      y: fill ? 0 : entry.localBounds.y,
      h: fill ? maxHeight : entry.localBounds.h
    };
    x += entry.newLocalBounds.w + gap;
  }

  return Box.boundingBox(children.map(c => c.localBounds));
};

const verticalLayout: Layout = (node: DiagramNode, children: Entry[], localBounds: Box) => {
  if (children.length === 0) return localBounds;

  const fill = node.props.container?.childResize === 'fill';
  const gap = node.props.container?.gap ?? 0;

  // Sort children by y position
  const sortedLocalChildren = children.sort((a, b) => a.localBounds.y - b.localBounds.y);

  const maxWidth = Math.max(
    node.bounds.w,
    largest(
      sortedLocalChildren.map(c => c.localBounds.w),
      (a, b) => a - b
    )!
  );

  let y = 0;
  for (const entry of sortedLocalChildren) {
    if (!isNode(entry.node)) continue;

    entry.newLocalBounds = {
      ...entry.localBounds,
      x: fill ? 0 : entry.localBounds.x,
      y,
      w: fill ? maxWidth : entry.localBounds.w
    };
    y += entry.newLocalBounds.h + gap;
  }

  return Box.boundingBox(children.map(c => c.localBounds));
};

const defaultLayout: Layout = (node: DiagramNode, children: Entry[], localBounds: Box) => {
  const props = node.props.container ?? {};

  if (props.containerResize === 'shrink' || props.containerResize === 'none') return localBounds;
  if (children.length === 0) return localBounds;

  return Box.boundingBox([localBounds, ...children.map(c => c.localBounds)]);
};

const LAYOUTS = {
  horizontal: horizontalLayout,
  vertical: verticalLayout,
  manual: defaultLayout
};

export class ContainerNodeDefinition extends ShapeNodeDefinition {
  constructor() {
    super('container', 'Container', ContainerComponent);
  }

  supports(capability: NodeCapability): boolean {
    return ['children'].includes(capability);
  }

  getBoundingPathBuilder(def: DiagramNode) {
    const pathBuilder = new PathBuilder(unitCoordinateSystem(def.bounds));
    pathBuilder.moveTo(Point.of(-1, 1));
    pathBuilder.lineTo(Point.of(1, 1));
    pathBuilder.lineTo(Point.of(1, -1));
    pathBuilder.lineTo(Point.of(-1, -1));
    pathBuilder.lineTo(Point.of(-1, 1));

    return pathBuilder;
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
      for (const child of node.children) {
        child.transform(transforms, uow, true);
      }

      return this.applyLayout(node, uow);
    }

    const isScaling = transforms.find(t => t instanceof Scale);

    let newWidth = newBounds.w;
    let newHeight = newBounds.h;
    const newTransforms: Array<Transform> = [...transforms];

    const canResize = node.props.container?.canResize;

    if (canResize !== 'width' && canResize !== 'both' && newBounds.w !== previousBounds.w) {
      newWidth = previousBounds.w;
    }

    if (canResize !== 'height' && canResize !== 'both' && newBounds.h !== previousBounds.h) {
      newHeight = previousBounds.h;
    }

    if (newWidth !== newBounds.w || newHeight !== newBounds.h) {
      node.setBounds({ ...newBounds, w: newWidth, h: newHeight }, uow);
      newTransforms.push(new Scale(newWidth / newBounds.w, newHeight / newBounds.h));
    }

    if (!isScaling || node.props.container?.childResize !== 'fixed') {
      for (const child of node.children) {
        child.transform(newTransforms, uow, true);
      }
    }

    return this.applyLayout(node, uow);
  }

  getCustomProperties(node: DiagramNode): Array<CustomPropertyDefinition> {
    return [
      {
        id: 'canResize',
        type: 'select',
        label: 'Resizeable',
        value: node.props.container?.canResize ?? 'none',
        options: [
          { value: 'none', label: 'None' },
          { value: 'width', label: 'Width' },
          { value: 'height', label: 'Height' },
          { value: 'both', label: 'Both' }
        ],
        onChange: (value: string, uow: UnitOfWork) => {
          node.updateProps(props => {
            props.container ??= {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            props.container.canResize = value as any;
          }, uow);
        }
      },
      {
        id: 'containerResize',
        type: 'select',
        label: 'Container Resize',
        value: node.props.container?.containerResize ?? 'none',
        options: [
          { value: 'none', label: 'None' },
          { value: 'shrink', label: 'Auto Shrink' },
          { value: 'grow', label: 'Auto Grow' },
          { value: 'both', label: 'Both' }
        ],
        onChange: (value: string, uow: UnitOfWork) => {
          node.updateProps(props => {
            props.container ??= {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            props.container.containerResize = value as any;
          }, uow);
        }
      },
      {
        id: 'layout',
        type: 'select',
        label: 'Layout',
        value: node.props.container?.layout ?? 'manual',
        options: [
          { value: 'manual', label: 'Manual' },
          { value: 'horizontal', label: 'Horizontal' },
          { value: 'vertical', label: 'Vertical' }
        ],
        onChange: (value: string, uow: UnitOfWork) => {
          node.updateProps(props => {
            props.container ??= {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            props.container.layout = value as any;
          }, uow);
        }
      },
      {
        id: 'gap',
        type: 'number',
        label: 'Gap',
        value: node.props.container?.gap ?? 0,
        unit: 'px',
        onChange: (value: number, uow: UnitOfWork) => {
          node.updateProps(props => {
            props.container ??= {};
            props.container.gap = value;
          }, uow);
        }
      },
      {
        id: 'childResize',
        type: 'select',
        label: 'Child Resize',
        value: node.props.container?.childResize ?? 'fixed',
        options: [
          { value: 'fixed', label: 'Fixed' },
          { value: 'scale', label: 'Scale' },
          { value: 'fill', label: 'Fill' }
        ],
        onChange: (value: string, uow: UnitOfWork) => {
          node.updateProps(props => {
            props.container ??= {};
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            props.container.childResize = value as any;
          }, uow);
        }
      }
    ];
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

  onChildChanged(node: DiagramNode, uow: UnitOfWork) {
    if (uow.changeType === 'interactive') return;

    this.applyLayout(node, uow);

    if (node.parent) {
      const parentDef = node.parent.getDefinition();
      parentDef.onChildChanged(node.parent, uow);
    }
  }

  onPropUpdate(node: DiagramNode, uow: UnitOfWork): void {
    this.applyLayout(node, uow);
  }

  private applyLayout(node: DiagramNode, uow: UnitOfWork) {
    const props = node.props.container ?? {};

    const autoShrink = props.containerResize === 'shrink' || props.containerResize === 'both';
    const autoGrow = props.containerResize === 'grow' || props.containerResize === 'both';

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

    const localBounds = Transform.box(node.bounds, ...transformBack);
    assert.true(Math.abs(localBounds.r) < 0.0001);

    const children: Entry[] = node.children.map(c => ({
      node: c,
      localBounds: Transform.box(c.bounds, ...transformBack),
      newLocalBounds: undefined
    }));

    if (children.length === 0) return;

    const layout = LAYOUTS[props.layout ?? 'manual'];
    let newBounds = layout(node, children, localBounds);

    // Shrink to minimum size, but retain the position
    let xEnd = localBounds.x + (autoShrink ? 0 : localBounds.w);
    let yEnd = localBounds.y + (autoShrink ? 0 : localBounds.h);
    if (autoGrow || autoShrink) {
      for (const entry of children) {
        const lb = entry.newLocalBounds ?? entry.localBounds;
        xEnd = Math.max(xEnd, lb.x + lb.w);
        yEnd = Math.max(yEnd, lb.y + lb.h);
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

    if (node.parent) {
      const parentDef = node.parent.getDefinition();
      parentDef.onChildChanged(node.parent, uow);
    }
  }
}

class ContainerComponent extends BaseNodeComponent {
  buildShape(props: BaseShapeBuildShapeProps, builder: ShapeBuilder) {
    const paths = new ContainerNodeDefinition().getBoundingPathBuilder(props.node).getPaths();

    const path = paths.singularPath();
    const svgPath = path.asSvgPath();

    builder.add(
      svg.path({
        'd': svgPath,
        'x': props.node.bounds.x,
        'y': props.node.bounds.y,
        'width': props.node.bounds.w,
        'height': props.node.bounds.h,
        'stroke': props.nodeProps.highlight?.includes('drop-target') ? '#30A46C' : '#d5d5d4',
        'stroke-width': props.nodeProps.highlight?.includes('drop-target') ? 3 : 1,
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
          this.makeElement(child, props)
        )
      );
    });
  }
}
