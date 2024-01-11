import { DiagramEdge } from './diagramEdge.ts';
import { DiagramNode, DuplicationContext } from './diagramNode.ts';
import { UnitOfWork } from './unitOfWork.ts';
import { AbstractElement } from './types.ts';
import { Box } from '../geometry/box.ts';
import { Layer } from './diagramLayer.ts';
import { Transform } from '../geometry/transform.ts';
import { Diagram } from './diagram.ts';

export interface DiagramElement extends AbstractElement {
  invalidate(uow: UnitOfWork): void;
  detach(uow: UnitOfWork): void;
  duplicate(ctx?: DuplicationContext): DiagramElement;
  transform(transforms: ReadonlyArray<Transform>, uow: UnitOfWork, isChild?: boolean): void;
  isLocked(): boolean;

  props: NodeProps | EdgeProps;
  parent?: DiagramNode;
  bounds: Box;
  layer: Layer;
  diagram: Diagram;
}

export const getDiagramElementPath = (element: DiagramElement): DiagramNode[] => {
  const dest: DiagramNode[] = [];
  let current: DiagramNode | undefined = element.parent;
  while (current !== undefined) {
    dest.push(current);
    current = current.parent;
  }
  return dest;
};

export const getTopMostNode = (element: DiagramNode): DiagramNode => {
  const path = getDiagramElementPath(element);
  return path.length > 0 ? path[path.length - 1] : element;
};

export const isNode = (e: DiagramElement | undefined): e is DiagramNode => !!e && e.type === 'node';
export const isEdge = (e: DiagramElement | undefined): e is DiagramEdge => !!e && e.type === 'edge';
