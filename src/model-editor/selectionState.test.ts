import { Guide, SelectionState } from './selectionState.ts';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { DiagramNode } from '../model-viewer/diagramNode.ts';
import { DiagramEdge } from '../model-viewer/diagramEdge.ts';
import { Box } from '../geometry/box.ts';

const createNode = () =>
  new DiagramNode(
    '1',
    'test',
    {
      pos: { x: 0, y: 0 },
      size: { w: 10, h: 10 },
      rotation: 0
    },
    undefined
  );

const createEdge = () =>
  new DiagramEdge(
    '1',
    {
      position: { x: 0, y: 0 }
    },
    {
      position: { x: 10, y: 10 }
    },
    {}
  );

describe('SelectionState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('isEmpty()', () => {
    const emptySelection = new SelectionState();
    expect(emptySelection.isEmpty()).toBe(true);
    expect(emptySelection.bounds.size.w).toBe(0);
    expect(emptySelection.bounds.size.h).toBe(0);
  });

  test('toggle()', () => {
    const element: DiagramNode = createNode();

    const selectionState = new SelectionState();

    const changeCb = vi.fn();
    const addCb = vi.fn();
    const removeCb = vi.fn();

    selectionState.on('change', changeCb);
    selectionState.on('add', addCb);
    selectionState.on('remove', removeCb);

    selectionState.toggle(element);
    expect(selectionState.isEmpty()).toBe(false);
    expect(selectionState.bounds.size.w).toBe(10);
    expect(selectionState.bounds.size.h).toBe(10);

    vi.advanceTimersByTime(1);
    expect(addCb).toHaveBeenCalledTimes(1);
    expect(removeCb).toHaveBeenCalledTimes(0);
    expect(changeCb).toHaveBeenCalledTimes(1);

    changeCb.mockReset();
    addCb.mockReset();
    removeCb.mockReset();

    selectionState.toggle(element);
    expect(selectionState.isEmpty()).toBe(true);
    expect(selectionState.bounds.size.w).toBe(0);
    expect(selectionState.bounds.size.h).toBe(0);

    vi.advanceTimersByTime(1);
    expect(addCb).toHaveBeenCalledTimes(0);
    expect(removeCb).toHaveBeenCalledTimes(1);
    expect(changeCb).toHaveBeenCalledTimes(1);
  });

  describe('getSelectionType()', () => {
    test('empty selection', () => {
      const selectionState = new SelectionState();
      expect(selectionState.getSelectionType()).toBe('empty');
    });

    test('single node', () => {
      const selectionState = new SelectionState();
      selectionState.toggle(createNode());
      expect(selectionState.getSelectionType()).toBe('single-node');
    });

    test('single edge', () => {
      const selectionState = new SelectionState();
      selectionState.toggle(createEdge());
      expect(selectionState.getSelectionType()).toBe('single-edge');
    });

    test('multiple nodes', () => {
      const selectionState = new SelectionState();
      selectionState.toggle(createNode());
      selectionState.toggle(createNode());
      expect(selectionState.getSelectionType()).toBe('nodes');
    });

    test('multiple edges', () => {
      const selectionState = new SelectionState();
      selectionState.toggle(createEdge());
      selectionState.toggle(createEdge());
      expect(selectionState.getSelectionType()).toBe('edges');
    });

    test('mixed', () => {
      const selectionState = new SelectionState();
      selectionState.toggle(createNode());
      selectionState.toggle(createEdge());
      expect(selectionState.getSelectionType()).toBe('mixed');
    });
  });

  test('isNodesOnly()', () => {
    const selectionState = new SelectionState();
    selectionState.toggle(createNode());
    expect(selectionState.isNodesOnly()).toBe(true);
    selectionState.toggle(createEdge());
    expect(selectionState.isNodesOnly()).toBe(false);
  });

  test('isEdgesOnly()', () => {
    const selectionState = new SelectionState();
    selectionState.toggle(createEdge());
    expect(selectionState.isEdgesOnly()).toBe(true);
    selectionState.toggle(createNode());
    expect(selectionState.isEdgesOnly()).toBe(false);
  });

  test('set guides', () => {
    const selectionState = new SelectionState();

    const changeCb = vi.fn();
    selectionState.on('change', changeCb);

    const guides: Guide[] = [{} as unknown as Guide];
    selectionState.guides = guides;
    expect(selectionState.guides).toBe(guides);

    vi.advanceTimersByTime(1);
    expect(changeCb).toHaveBeenCalledTimes(1);
  });

  test('set marquee', () => {
    const selectionState = new SelectionState();

    const changeCb = vi.fn();
    selectionState.on('change', changeCb);

    const marquee: Box = { pos: { x: 0, y: 0 }, size: { w: 10, h: 10 }, rotation: 0 };
    selectionState.marquee = marquee;
    expect(selectionState.marquee).toBe(marquee);

    vi.advanceTimersByTime(1);
    expect(changeCb).toHaveBeenCalledTimes(1);
  });
});
