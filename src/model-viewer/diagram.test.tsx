import { describe, expect, test } from 'vitest';
import { Diagram, ResolvedNodeDef } from './diagram.ts';
import { TransformFactory } from '../geometry/transform.ts';

describe('Diagram', () => {
  test('transform rotate', () => {
    const node1: ResolvedNodeDef = {
      type: 'node',
      nodeType: 'a',
      id: '1',
      children: [],
      bounds: {
        pos: { x: 0, y: 0 },
        size: { w: 100, h: 100 },
        rotation: 0
      }
    };

    const node2: ResolvedNodeDef = {
      type: 'node',
      nodeType: 'a',
      id: '2',
      children: [],
      bounds: {
        pos: { x: 100, y: 100 },
        size: { w: 100, h: 100 },
        rotation: 0
      }
    };

    const nodes = [node1, node2];
    const diagram = new Diagram(nodes);

    const before = { pos: { x: 0, y: 0 }, size: { w: 200, h: 200 }, rotation: 0 };
    const after = { pos: { x: 0, y: 0 }, size: { w: 200, h: 200 }, rotation: Math.PI / 2 };
    diagram.transformNodes(nodes, TransformFactory.fromTo(before, after));

    expect(node1.bounds.rotation).toStrictEqual(Math.PI / 2);
    expect(node1.bounds.pos).toStrictEqual({ x: 100, y: 0 });
    expect(node1.bounds.size).toStrictEqual({ w: 100, h: 100 });

    expect(node2.bounds.rotation).toStrictEqual(Math.PI / 2);
    expect(node2.bounds.pos).toStrictEqual({ x: 0, y: 100 });
    expect(node2.bounds.size).toStrictEqual({ w: 100, h: 100 });
  });

  test.skip('transform rotate - inverse', () => {
    const node1: ResolvedNodeDef = {
      type: 'node',
      nodeType: 'a',
      id: '1',
      children: [],
      bounds: {
        pos: { x: 10, y: 10 },
        size: { w: 100, h: 100 },
        rotation: 0
      }
    };

    const node2: ResolvedNodeDef = {
      type: 'node',
      nodeType: 'a',
      id: '2',
      children: [],
      bounds: {
        pos: { x: 100, y: 100 },
        size: { w: 100, h: 100 },
        rotation: 0
      }
    };

    const nodes = [node1, node2];
    const diagram = new Diagram(nodes);

    const before = { pos: { x: 10, y: 10 }, size: { w: 200, h: 300 }, rotation: 0 };
    const after = { pos: { x: 10, y: 10 }, size: { w: 200, h: 300 }, rotation: Math.PI / 3 };

    diagram.transformNodes(nodes, TransformFactory.fromTo(before, after));
    diagram.transformNodes(nodes, TransformFactory.fromTo(after, before));

    expect(node1.bounds.rotation).toStrictEqual(0);
    expect(node1.bounds.pos).toStrictEqual({ x: 10, y: 10 });
    expect(node1.bounds.size).toStrictEqual({ w: 100, h: 100 });

    expect(node2.bounds.rotation).toStrictEqual(0);
    expect(node2.bounds.pos).toStrictEqual({ x: 100, y: 100 });
    expect(node2.bounds.size).toStrictEqual({ w: 100, h: 100 });
  });
});