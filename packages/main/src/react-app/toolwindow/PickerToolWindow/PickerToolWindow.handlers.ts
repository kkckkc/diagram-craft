import { Diagram } from '@diagram-craft/model/diagram';
import { assertRegularLayer } from '@diagram-craft/model/diagramLayerUtils';

export const canvasDropHandler = ($d: Diagram) => {
  return (_e: DragEvent) => {
    assertRegularLayer($d.activeLayer);
  };
};

export const canvasDragOverHandler = ($d: Diagram) => {
  return (e: DragEvent) => {
    const activeLayer = $d.activeLayer;
    if (activeLayer.isLocked() || activeLayer.resolve()?.type === 'rule') {
      e.dataTransfer!.dropEffect = 'none';
    } else {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'copy';
    }
  };
};
