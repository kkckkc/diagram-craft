import { Diagram } from '../model/diagram.ts';
import React from 'react';
import { DiagramNode } from '../model/diagramNode.ts';
import { newid } from '../utils/id.ts';
import { EventHelper } from '../base-ui/eventHelper.ts';
import { ElementAddUndoableAction } from '../model/diagramUndoActions.ts';

export const canvasDropHandler = ($d: Diagram) => {
  return (e: React.DragEvent<SVGSVGElement>) => {
    const nodeType = e.dataTransfer.getData('application/x-diagram-craft-node-type');
    const nodeDef = $d.nodeDefinitions.get(nodeType);

    const nd = new DiagramNode(
      newid(),
      nodeType,
      {
        ...$d.viewBox.toDiagramPoint(EventHelper.point(e.nativeEvent)),
        ...nodeDef.getInitialConfig().size,
        r: 0
      },
      $d,
      $d.layers.active,
      nodeDef.getDefaultProps('canvas')
    );

    $d.undoManager.addAndExecute(new ElementAddUndoableAction([nd], $d));

    $d.selectionState.clear();
    $d.selectionState.toggle(nd);

    if (nodeType === 'text') {
      setTimeout(() => {
        $d.nodeDefinitions.get(nodeType).requestFocus(nd);
      }, 10);
    }
  };
};

export const canvasDragOverHandler = () => {
  return (e: React.DragEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
};