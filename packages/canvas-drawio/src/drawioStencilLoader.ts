import { Diagram } from '@diagram-craft/model/diagram';
import { Stencil } from '@diagram-craft/model/elementDefinitionRegistry';
import { newid } from '@diagram-craft/utils/id';
import { DiagramNode } from '@diagram-craft/model/diagramNode';
import { UnitOfWork } from '@diagram-craft/model/unitOfWork';
import { assert } from '@diagram-craft/utils/assert';
import { Box } from '@diagram-craft/geometry/box';
import { assertDrawioShapeNodeDefinition } from './DrawioShape.nodeType';
import { xNum } from '@diagram-craft/utils/xml';

export type DrawioStencil = {
  key: string;
  group: string;
  props: NodeProps;
  dimensions: { w: number; h: number };
};

export const findStencilByName = (stencils: Array<DrawioStencil>, name: string) => {
  const s = stencils.find(s => s.key.toLowerCase() === name.toLowerCase());
  assert.present(s, `Cannot find stencil ${name}`);
  return s;
};

export const toTypeName = (n: string) => {
  return n.toLowerCase().replaceAll(' ', '_').replaceAll('-', '_').replaceAll("'", '');
};

export const loadDrawioStencils = async (
  url: string,
  group: string,
  foreground = 'black',
  background = 'white'
) => {
  const res = await fetch(url);
  const txt = await res.text();

  const parser = new DOMParser();
  const $doc = parser.parseFromString(txt, 'application/xml');

  const newStencils: Array<DrawioStencil> = [];

  const xmlSerializer = new XMLSerializer();

  const $shapes = $doc.getElementsByTagName('shape');
  for (let i = 0; i < $shapes.length; i++) {
    const name = $shapes[i].getAttribute('name')!;
    newStencils.push({
      group: group,
      key: name,
      props: {
        fill: { color: background },
        stroke: { color: foreground },
        custom: {
          drawio: { shape: btoa(xmlSerializer.serializeToString($shapes[i])) }
        }
      },
      dimensions: {
        w: xNum($shapes[i], 'w'),
        h: xNum($shapes[i], 'h')
      }
    });
  }

  return newStencils;
};

export const toRegularStencil = (drawio: DrawioStencil): Stencil => {
  const mkNode = ($d: Diagram) => {
    const type = 'drawio';

    const def = $d.document.nodeDefinitions.get(type);
    assertDrawioShapeNodeDefinition(def);

    const n = new DiagramNode(newid(), type, Box.unit(), $d, $d.activeLayer, drawio.props, {});

    const size = def.getSize(n);
    n.setBounds({ x: 0, y: 0, w: size.w, h: size.h, r: 0 }, UnitOfWork.immediate($d));

    return n;
  };
  return {
    id: drawio.key,
    name: drawio.key,
    node: mkNode,
    canvasNode: mkNode
  };
};
