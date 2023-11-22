import { Line } from '../../geometry/line.ts';
import { MatchingMagnetPair, SnapProvider } from './snapManager.ts';
import { Point } from '../../geometry/point.ts';
import { Box } from '../../geometry/box.ts';
import { Guide } from '../selectionState.ts';
import { Diagram } from '../../model-viewer/diagram.ts';
import { MagnetOfType, Axis } from './magnet.ts';

export class CanvasSnapProvider implements SnapProvider<'canvas'> {
  constructor(private readonly diagram: Diagram) {}

  getMagnets(_box: Box): MagnetOfType<'canvas'>[] {
    const { w, h } = this.diagram.canvas.size;
    return [
      {
        line: Line.of({ x: w / 2, y: 0 }, { x: w / 2, y: h }),
        axis: 'v',
        type: 'canvas'
      },
      {
        line: Line.of({ x: 0, y: h / 2 }, { x: w, y: h / 2 }),
        axis: 'h',
        type: 'canvas'
      }
    ];
  }

  makeGuide(_box: Box, match: MatchingMagnetPair<'canvas'>, _axis: Axis): Guide {
    return {
      line: match.matching.line,
      matchingMagnet: match.matching,
      selfMagnet: match.self
    };
  }

  Magnet(magnet: MagnetOfType<'canvas'>, delta: Point): void {
    magnet.line = Line.move(magnet.line, delta);
  }
}
