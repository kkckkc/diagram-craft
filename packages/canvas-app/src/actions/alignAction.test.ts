import { beforeEach, describe, expect, test } from 'vitest';
import { AlignAction } from './alignAction';
import { DiagramBuilder, DocumentBuilder } from '@diagram-craft/model/test-support/builder';

describe('AlignActions', () => {
  let diagram: DiagramBuilder;

  beforeEach(() => {
    diagram = new DocumentBuilder().newDiagram();
    const layer = diagram.newLayer();
    layer.addNode('1', 'rect', {
      bounds: { x: 10, y: 10, w: 100, h: 100, r: 0 }
    });
    layer.addNode('2', 'rect', {
      bounds: { x: 20, y: 20, w: 70, h: 150, r: 0 }
    });
    layer.addNode('3', 'rect', {
      bounds: { x: 10, y: 5, w: 100, h: 60, r: 0 }
    });
  });

  describe('enabled', () => {
    test('should not be enabled when there the selection is only one or empty', () => {
      diagram.selectionState.setElements([]);
      expect(new AlignAction(diagram, 'top').isEnabled({})).toBe(false);

      diagram.selectionState.setElements([diagram.layers.active.elements[0]]);
      expect(new AlignAction(diagram, 'top').isEnabled({})).toBe(false);
    });

    test('should be enabled when there are more than one element selected', () => {
      diagram.selectionState.setElements(diagram.layers.active.elements);
      expect(new AlignAction(diagram, 'top').isEnabled({})).toBe(true);
    });
  });

  describe('align', () => {
    test('should align the selected elements to the top', () => {
      const [e1, e2, e3] = diagram.layers.active.elements;
      diagram.selectionState.setElements([e1, e2, e3]);

      new AlignAction(diagram, 'top').execute();
      expect(e1.bounds.y).toBe(10);
      expect(e2.bounds.y).toBe(10);
      expect(e3.bounds.y).toBe(10);
    });

    test('should align the selected elements to the bottom', () => {
      const [e1, e2, e3] = diagram.layers.active.elements;
      diagram.selectionState.setElements([e1, e2, e3]);

      new AlignAction(diagram, 'bottom').execute();
      expect(e1.bounds.y).toBe(10);
      expect(e2.bounds.y).toBe(-40);
      expect(e3.bounds.y).toBe(50);
    });

    test('should align the selected elements to the center-horizontal', () => {
      const [e1, e2, e3] = diagram.layers.active.elements;
      diagram.selectionState.setElements([e1, e2, e3]);

      new AlignAction(diagram, 'center-horizontal').execute();
      expect(e1.bounds.y).toBe(10);
      expect(e2.bounds.y).toBe(-15);
      expect(e3.bounds.y).toBe(30);
    });

    test('should align the selected elements to the left', () => {
      const [e1, e2, e3] = diagram.layers.active.elements;
      diagram.selectionState.setElements([e1, e2, e3]);

      new AlignAction(diagram, 'left').execute();
      expect(e1.bounds.x).toBe(10);
      expect(e2.bounds.x).toBe(10);
      expect(e3.bounds.x).toBe(10);
    });

    test('should align the selected elements to the right', () => {
      const [e1, e2, e3] = diagram.layers.active.elements;
      diagram.selectionState.setElements([e1, e2, e3]);

      new AlignAction(diagram, 'right').execute();
      expect(e1.bounds.x).toBe(10);
      expect(e2.bounds.x).toBe(40);
      expect(e3.bounds.x).toBe(10);
    });

    test('should align the selected elements to the center-vertical', () => {
      const [e1, e2, e3] = diagram.layers.active.elements;
      diagram.selectionState.setElements([e1, e2, e3]);

      new AlignAction(diagram, 'center-vertical').execute();
      expect(e1.bounds.x).toBe(10);
      expect(e2.bounds.x).toBe(25);
      expect(e3.bounds.x).toBe(10);
    });
  });
});
