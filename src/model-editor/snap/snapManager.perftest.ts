import { PerformanceTest } from '../../utils/perftest.ts';
import { SnapManager } from './snapManager.ts';
import { EditableDiagram } from '../editable-diagram.ts';
import { DiagramNode } from '../../model-viewer/diagramNode.ts';
import {
  EdgeDefinitionRegistry,
  NodeDefinitionRegistry
} from '../../model-viewer/nodeDefinition.ts';

export class SnapManagerPerftest implements PerformanceTest {
  private snapManager: SnapManager | undefined;

  setup(): void {
    const defs: DiagramNode[] = [];
    for (let i = 0; i < 1000; i++) {
      defs.push(new DiagramNode(i.toString(), 'box', this.randomBox(), undefined));
    }

    const d = new EditableDiagram(
      '1',
      defs,
      new NodeDefinitionRegistry(),
      new EdgeDefinitionRegistry()
    );
    this.snapManager = d.createSnapManager();
  }

  private randomBox() {
    return {
      pos: {
        x: Math.round(Math.random() * 1000),
        y: Math.round(Math.random() * 1000)
      },
      size: {
        w: Math.round(Math.random() * 100) + 1,
        h: Math.round(Math.random() * 100) + 1
      },
      rotation: 0
    };
  }

  testCases(): { label: string; run: () => number }[] {
    return [
      {
        label: 'snapManager',
        run: () => {
          const iter = 60;
          for (let i = 0; i < iter; i++) {
            this.snapManager!.snapMove(this.randomBox());
          }
          return iter;
        }
      }
    ];
  }
}
