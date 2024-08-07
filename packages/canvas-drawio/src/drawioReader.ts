import { DiagramFactory, DocumentFactory } from '@diagram-craft/model/serialization/deserialize';
import { Diagram } from '@diagram-craft/model/diagram';
import { DiagramDocument } from '@diagram-craft/model/diagramDocument';
import { Layer } from '@diagram-craft/model/diagramLayer';
import { UnitOfWork } from '@diagram-craft/model/unitOfWork';
import { DiagramNode, NodeTexts } from '@diagram-craft/model/diagramNode';
import { parseNum, xNum } from './utils';
import { Box } from '@diagram-craft/geometry/box';
import { DiagramEdge } from '@diagram-craft/model/diagramEdge';
import { DiagramElement } from '@diagram-craft/model/diagramElement';
import { FreeEndpoint, PointInNodeEndpoint } from '@diagram-craft/model/endpoint';
import { Point } from '@diagram-craft/geometry/point';
import { assert } from '@diagram-craft/utils/assert';
import { LengthOffsetOnPath, TimeOffsetOnPath } from '@diagram-craft/geometry/pathPosition';
import { Vector } from '@diagram-craft/geometry/vector';
import { clipPath } from '@diagram-craft/model/edgeUtils';
import { assertHAlign, assertVAlign } from '@diagram-craft/model/diagramProps';
import { ARROW_SHAPES } from '@diagram-craft/canvas/arrowShapes';
import { Angle } from '@diagram-craft/geometry/angle';
import { Waypoint } from '@diagram-craft/model/types';
import { Line } from '@diagram-craft/geometry/line';
import { newid } from '@diagram-craft/utils/id';
import {
  parseArrow,
  parseBlockArc,
  parseCloud,
  parseCube,
  parseCurlyBracket,
  parseCylinder,
  parseDelay,
  parseDiamond,
  parseEllipse,
  parseHexagon,
  parseImage,
  parseLine,
  parseParallelogram,
  parsePartialRect,
  parseProcess,
  parseRect,
  parseRhombus,
  parseRoundedRect,
  parseStep,
  parseSwimlane,
  parseTable,
  parseTableRow,
  parseTransparent,
  parseTriangle
} from './shapes';
import { registerAzureShapes } from './shapes/azure';
import { NodeDefinitionRegistry } from '@diagram-craft/model/elementDefinitionRegistry';
import {
  registerOfficeCloudsShapes,
  registerOfficeCommunicationsShapes,
  registerOfficeConceptShapes,
  registerOfficeDatabasesShapes,
  registerOfficeDevicesShapes,
  registerOfficeSecurityShapes,
  registerOfficeServersShapes,
  registerOfficeServicesShapes,
  registerOfficeSitesShapes,
  registerOfficeUsersShapes
} from './shapes/office';
import { registerCitrixShapes } from './shapes/citrix';
import { registerVeeamShapes } from './shapes/veeam';
import { registerVeeam3dShapes } from './shapes/veeam3d';
import { registerVeeam2dShapes } from './shapes/veeam2d';
import { registerCisco19Shapes } from './shapes/cisco19';
import { registerAWS4Shapes } from './shapes/aws4';
import { registerGCP2Shapes } from './shapes/gcp2';
import { registerC4Shapes } from './shapes/c4';
import { registerSalesforceShapes } from './shapes/salesforce';
import { registerUMLShapes } from './shapes/uml/uml';
import { registerAndroidShapes } from './shapes/android/android';

const drawioBuiltinShapes: Partial<Record<string, string>> = {
  actor:
    'stencil(tZPtDoIgFIavhv8IZv1tVveBSsm0cPjZ3QeCNlBytbU5tvc8x8N74ABwXOekogDBHOATQCiAUK5S944mdUXTRgc7IhhJSqpJ3Qhe0J5ljanBHjkVrFEUnwE8yhz14TghaXETvH1kDgDo4mVXLugKmHBF1LYLMOE771R3g3Zmenk6vcntP5RIW6FrBHYRIyOjB2RjI8MJY613E8c2/85DsLdNhI6JmdumfCZ+8nDAtgfHwoz/exAQbpwEdC4kcny8E9zAhpOS19SbNc60ZzblTLOy1M9mpcD462Lqx6h+rGPgBQ==)'
};

export type Style = Partial<Record<string, string>>;

class WorkQueue {
  queue: [Array<() => void>, Array<() => void>] = [[], []];

  add(work: () => void, priority: 0 | 1 = 0) {
    this.queue[priority].push(work);
  }

  run() {
    this.queue[0].forEach(work => work());
    this.queue[1].forEach(work => work());
  }
}

export type ShapeParser = (
  id: string,
  bounds: Box,
  props: NodeProps,
  metadata: ElementMetadata,
  texts: NodeTexts,
  style: Style,
  diagram: Diagram,
  layer: Layer
) => Promise<DiagramNode>;

export const shapeParsers: Record<string, ShapeParser> = {
  'hexagon': parseHexagon,
  'step': parseStep,
  'cloud': parseCloud,
  'rect': parseRect,
  'transparent': parseTransparent,
  'partialRectangle': parsePartialRect,
  'delay': parseDelay,
  'rhombus': parseRhombus,
  'parallelogram': parseParallelogram,
  'cylinder': parseCylinder,
  'cylinder3': parseCylinder,
  'process': parseProcess,
  'curlyBracket': parseCurlyBracket,
  'mxgraph.basic.partConcEllipse': parseBlockArc,
  'triangle': parseTriangle,
  'mxgraph.arrows2.arrow': parseArrow,
  'image': parseImage,
  'cube': parseCube,
  'line': parseLine,
  'ellipse': parseEllipse,
  'table': parseTable,
  'tableRow': parseTableRow
};

const getParser = (shape: string | undefined): ShapeParser | undefined =>
  shapeParsers[shape as keyof ShapeParser] ??
  shapeParsers[shape?.split('.').slice(0, -1).join('.') as keyof ShapeParser];

type Loader = (
  registry: NodeDefinitionRegistry,
  parsers: Record<string, ShapeParser>
) => Promise<void>;

const loaders: Array<[RegExp, Loader]> = [
  [/^mxgraph\.azure/, registerAzureShapes],
  [/^mxgraph\.office\.communications/, registerOfficeCommunicationsShapes],
  [/^mxgraph\.office\.concepts/, registerOfficeConceptShapes],
  [/^mxgraph\.office\.clouds/, registerOfficeCloudsShapes],
  [/^mxgraph\.office\.databases/, registerOfficeDatabasesShapes],
  [/^mxgraph\.office\.devices/, registerOfficeDevicesShapes],
  [/^mxgraph\.office\.security/, registerOfficeSecurityShapes],
  [/^mxgraph\.office\.servers/, registerOfficeServersShapes],
  [/^mxgraph\.office\.services/, registerOfficeServicesShapes],
  [/^mxgraph\.office\.sites/, registerOfficeSitesShapes],
  [/^mxgraph\.office\.users/, registerOfficeUsersShapes],
  [/^mxgraph\.citrix/, registerCitrixShapes],
  [/^mxgraph\.veeam2/, registerVeeamShapes],
  [/^mxgraph\.veeam\.2d/, registerVeeam2dShapes],
  [/^mxgraph\.veeam\.3d/, registerVeeam3dShapes],
  [/^mxgraph\.cisco19/, registerCisco19Shapes],
  [/^mxgraph\.aws4/, registerAWS4Shapes],
  [/^mxgraph\.gcp2/, registerGCP2Shapes],
  [/^mxgraph\.c4/, registerC4Shapes],
  [/^mxgraph\.salesforce/, registerSalesforceShapes],
  [/^mxgraph\.android/, registerAndroidShapes],
  [
    /^(module|folder|providedRequiredInterface|requiredInterface|uml[A-Z][a-z]+)$/,
    registerUMLShapes
  ]
];

const getLoader = (shape: string | undefined): Loader | undefined => {
  for (const [r, fn] of loaders) {
    if (shape?.match(r)) {
      return fn;
    }
  }
  return undefined;
};

const load = async (
  loader: Loader,
  registry: NodeDefinitionRegistry,
  alreadyLoaded: Set<Loader>
) => {
  if (alreadyLoaded.has(loader)) return;
  await loader(registry, shapeParsers);
  alreadyLoaded.add(loader);
};

const parseStyle = (style: string) => {
  const parts = style.split(';');
  const result: Style = {};
  for (const part of parts) {
    const [key, ...value] = part.split('=');
    result[key] = value.join('=');
  }
  return result;
};

const parseShape = (shape: string | undefined) => {
  if (getParser(shape)) return undefined;

  if (getLoader(shape)) return undefined;

  // TODO: Are these still needed
  if (shape === 'mxgraph.basic.rect') return undefined;
  if (shape === 'circle3') return undefined;
  if (shape === 'flexArrow') return undefined;

  if (!shape) return undefined;

  if (!shape.startsWith('stencil(')) {
    console.warn(`Unsupported shape ${shape}`);
    return undefined;
  }

  return /^stencil\(([^)]+)\)$/.exec(shape)![1];
};

const angleFromDirection = (s: string) => {
  if (s === 'north') return -Math.PI / 2;
  if (s === 'south') return Math.PI / 2;
  if (s === 'east') return 0;
  if (s === 'west') return Math.PI;
  return 0;
};

const arrows: Record<string, keyof typeof ARROW_SHAPES> = {
  'open': 'SQUARE_STICK_ARROW',
  'classic': 'SHARP_ARROW_FILLED',
  'classicThin': 'SHARP_ARROW_THIN_FILLED',
  'oval': 'BALL_FILLED',
  'doubleBlock': 'SQUARE_DOUBLE_ARROW_FILLED',
  'doubleBlock-outline': 'SQUARE_DOUBLE_ARROW_OUTLINE',
  'ERzeroToMany-outline': 'CROWS_FEET_BALL',
  'ERzeroToOne-outline': 'BAR_BALL',
  'ERoneToMany-outline': 'CROWS_FEET_BAR',
  'ERmandOne-outline': 'BAR_DOUBLE',
  'ERone-outline': 'BAR',
  'baseDash-outline': 'BAR_END',
  'halfCircle-outline': 'SOCKET',
  'box-outline': 'BOX_OUTLINE',
  'diamond-outline': 'DIAMOND_OUTLINE',
  'diamondThin-outline': 'DIAMOND_THIN_OUTLINE',
  'diamond': 'DIAMOND_FILLED',
  'diamondThin': 'DIAMOND_THIN_FILLED',
  'circle': 'BALL_FILLED',
  'circle-outline': 'BALL_OUTLINE',
  'circlePlus-outline': 'BALL_PLUS_OUTLINE',
  'oval-outline': 'BALL_OUTLINE',
  'block': 'SQUARE_ARROW_FILLED',
  'blockThin': 'SQUARE_ARROW_THIN_FILLED',
  'block-outline': 'SQUARE_ARROW_OUTLINE',
  'open-outline': 'SQUARE_STICK_ARROW',
  'openAsync-outline': 'SQUARE_STICK_ARROW_HALF_LEFT',
  'async': 'SQUARE_STICK_ARROW_HALF_LEFT_THIN_FILLED',
  'classic-outline': 'SHARP_ARROW_OUTLINE',
  'blockThin-outline': 'SQUARE_ARROW_THIN_OUTLINE',
  'async-outline': 'SQUARE_STICK_ARROW_HALF_LEFT_THIN_OUTLINE',
  'dash-outline': 'SLASH',
  'cross-outline': 'CROSS',
  'openThin-outline': 'SQUARE_STICK_ARROW',
  'manyOptional': 'CROWS_FEET_BALL_FILLED',
  'manyOptional-outline': 'CROWS_FEET_BALL'
};

const parseEdgeArrow = (t: 'start' | 'end', style: Style, props: EdgeProps & NodeProps) => {
  let type = style[`${t}Arrow`];
  const size = style[`${t}Size`];
  const fill = style[`${t}Fill`];

  if (type && type !== 'none') {
    if (fill === '0') {
      type += '-outline';
    }

    if (!(type in arrows)) {
      console.warn(`Arrow type ${type} not yet supported`);
    }

    props.arrow ??= {};
    props.arrow![t] = {
      type: arrows[type],
      size: parseNum(size, 6) * (type === 'circle' || type === 'circlePlus-outline' ? 20 : 11)
    };
    props.stroke!.color ??= 'black';
    if (props.stroke!.color === 'default') {
      props.stroke!.color = 'black';
    }
    props.fill!.color = props.stroke!.color;
  }
};

const MxPoint = {
  pointFrom: (offset: Element) => Point.of(xNum(offset, 'x', 0), xNum(offset, 'y', 0))
};

const MxGeometry = {
  boundsFrom: (geometry: Element) => {
    return {
      x: xNum(geometry, 'x', 0),
      y: xNum(geometry, 'y', 0),
      w: xNum(geometry, 'width', 100),
      h: xNum(geometry, 'height', 100),
      r: 0
    };
  }
};

const hasValue = (value: string | undefined | null): value is string => {
  if (!value || value.trim() === '') return false;

  if (value.startsWith('<')) {
    if (value.includes('<img')) return true;
    try {
      const d = new DOMParser().parseFromString(value, 'text/html');
      const text = d.body.textContent;
      return !!text && text.trim() !== '';
    } catch (e) {
      // Ignore
    }
  }
  return true;
};

const calculateLabelNodeActualSize = (
  style: Style,
  textNode: DiagramNode,
  value: string,
  uow: UnitOfWork
) => {
  const $el = document.createElement('div');
  $el.style.visibility = 'hidden';
  $el.style.position = 'absolute';
  $el.style.width = 'auto';
  $el.style.lineHeight = '0';
  document.body.appendChild($el);

  const css: string[] = [];

  css.push('font-size: ' + parseNum(style.fontSize, 12) + 'px');
  css.push('font-family: ' + (style.fontFamily ?? 'Helvetica'));
  css.push('direction: ltr');
  css.push('line-height: 120%');
  css.push('color: black');

  $el.innerHTML = value.startsWith('<') ? value : `<span style="${css.join(';')}">${value}</span>`;

  textNode.setBounds(
    {
      x: textNode.bounds.x,
      y: textNode.bounds.y,
      // TODO: Need to tune this a bit better
      w: $el.offsetWidth + 1,
      h: $el.offsetHeight,
      r: 0
    },
    uow
  );

  document.body.removeChild($el);
};

const createLabelNode = (
  id: string,
  edge: DiagramEdge,
  text: string,
  props: NodeProps,
  bgColor: string,
  uow: UnitOfWork
) => {
  const textNode = new DiagramNode(
    id,
    'text',
    edge.bounds,
    edge.diagram,
    edge.layer,
    {
      text: {
        align: props.text?.align,
        valign: props.text?.valign,
        fontSize: props.text?.fontSize,
        font: props.text?.font
      },
      fill: {
        enabled: true,
        type: 'solid',
        color: bgColor
      }
    },
    {},
    {
      text
    }
  );

  // Add text node to any parent group
  if (edge.parent) {
    edge.parent.setChildren([...edge.parent.children, textNode], uow);
  }

  return textNode;
};

const attachLabelNode = (
  textNode: DiagramNode,
  edge: DiagramEdge,
  $geometry: Element,
  uow: UnitOfWork
) => {
  // The x coordinate represent the offset along the path, encoded as a number
  // between -1 and 1 - we need to convert to a number between 0 and 1
  const xOffset = (xNum($geometry, 'x', 0) + 1) / 2;

  const path = edge.path();
  if (path.length() === 0) {
    console.error('Path has zero length', path);
    return;
  }

  const clippedPath = clipPath(path, edge, undefined, undefined)!;

  // Since drawio uses a position on the clipped path, we convert the offset to a
  // point (x, y) on the path
  const lengthOffsetOnClippedPath = TimeOffsetOnPath.toLengthOffsetOnPath(
    { pathT: xOffset },
    clippedPath
  );
  const anchorPoint = clippedPath.pointAt(lengthOffsetOnClippedPath);

  // ... and then we convert this to a time offset on the full path (as this is the
  // representation we use
  const { pathT: timeOffset } = LengthOffsetOnPath.toTimeOffsetOnPath(
    path.projectPoint(anchorPoint),
    path
  );

  // In drawio, the y coordinate represents an offset along the normal at
  // the point described by the x-coordinate

  // So first we calculate the normal at this point
  const tangent = clippedPath.tangentAt(lengthOffsetOnClippedPath);
  const normal = Point.rotate(tangent, Math.PI / 2);

  // Then we calculate a vector from the point of the path to the
  // point described by the y-coordinate
  const initialOffset = Vector.scale(normal, -xNum($geometry, 'y', 0));

  // In draw io there's a second offset from the point calculated above
  const mxPointOffset = Array.from($geometry.getElementsByTagName('mxPoint')).find(
    e => e.getAttribute('as') === 'offset'
  );

  // We describe the label node location as a time offset on the path (0 - 1) and then
  // an offset from this point - this is essentially the sum as the two drawio offsets
  const offset = mxPointOffset
    ? Point.add(MxPoint.pointFrom(mxPointOffset), initialOffset)
    : Point.ORIGIN;

  edge.addLabelNode(
    { id: textNode.id, type: 'horizontal', node: textNode, offset, timeOffset },
    uow
  );
};

const getNodeProps = (style: Style, isEdge: boolean) => {
  // NOTE: test6.drawio suggests this should be center
  const align = style.align ?? 'center';
  assertHAlign(align);

  const valign = style.verticalAlign ?? 'middle';
  assertVAlign(valign);

  const props: NodeProps = {
    text: {
      fontSize: parseNum(style.fontSize, isEdge ? 11 : 12),
      font: style.fontFamily ?? 'Helvetica',
      color: style.fontColor ?? 'black',
      lineHeight: 0.97,

      // Note: It seems some needs a default spacing of 5 (e.g. aws2024 / groups)
      //       ... and some need a spacing of 0 (need to get which one)
      top: parseNum(style.spacingTop, 5) + parseNum(style.spacing, 2),
      bottom: parseNum(style.spacingBottom, 5) + parseNum(style.spacing, 2),

      left: parseNum(style.spacingLeft, 0) + parseNum(style.spacing, 2),
      right: parseNum(style.spacingRight, 0) + parseNum(style.spacing, 2),
      align: align,
      valign: valign
    },
    fill: {
      color: style.fillColor ?? 'white'
    },
    geometry: {
      // Not sure checking if the object has a shape is correct
      // This is a workaround as flipping a shape doesn't flip the text?
      flipH: 'shape' in style && style.flipH === '1',
      flipV: 'shape' in style && style.flipV === '1'
    }
  };

  if (props.text!.color === '#') props.text!.color = 'black';

  if (style.fontStyle === '1') {
    props.text!.bold = true;
  } else if (style.fontStyle === '2') {
    props.text!.italic = true;
  } else if (style.fontStyle === '3') {
    props.text!.bold = true;
    props.text!.italic = true;
  } else if (style.fontStyle === '4') {
    props.text!.textDecoration = 'underline';
  }

  if (style.gradientColor && style.gradientColor !== 'none' && style.gradientColor !== 'inherit') {
    props.fill!.type = 'gradient';
    props.fill!.color2 = style.gradientColor;
    props.fill!.gradient = {
      type: 'linear',
      direction: angleFromDirection(style.gradientDirection ?? 'south')
    };
  }

  if (style.opacity && style.opacity !== '100') {
    props.effects ??= {};
    props.effects.opacity = parseNum(style.opacity, 100) / 100;
  }

  if (style.sketch === '1') {
    props.effects ??= {};
    props.effects.sketch = true;
    props.effects.sketchFillType = 'hachure';
  }

  props.stroke = {
    color: style.strokeColor,
    width: parseNum(style.strokeWidth, 1)
  };

  if (style.dashed === '1') {
    const pattern = style.dashPattern ?? '4 4';
    const [baseSize, baseGap] = pattern.split(' ').map(s => parseNum(s, 4));
    const strokeWidth = parseNum(style.strokeWidth, 1);

    props.stroke.pattern = 'DASHED';
    props.stroke.patternSpacing = baseGap * 10 * strokeWidth;
    props.stroke.patternSize = baseSize * 10 * strokeWidth;
    props.stroke.lineCap = 'butt';
  }

  // TODO: This is a bit ugly - need to fix
  if (style.rounded === '1' && style.shape !== 'mxgraph.android.rect') {
    props.effects ??= {};
    props.effects.rounding = true;
  }

  if (style.shadow === '1') {
    props.shadow = {
      enabled: true,
      color: '#999999',
      x: 3,
      y: 3,
      blur: 3
    };
  }

  if (style.labelPosition === 'right') {
    props.custom ??= {};
    props.custom.drawio ??= {};
    props.custom.drawio.textPosition = 'right';
  }

  return props;
};

const attachEdge = (edge: DiagramEdge, $cell: Element, style: Style, uow: UnitOfWork) => {
  const diagram = edge.diagram;

  const source = $cell.getAttribute('source')!;
  if (source) {
    const sourceNode = diagram.nodeLookup.get(source);
    if (sourceNode) {
      const defaultPoint = Point.of(0.5, 0.5);

      const x = parseNum(style.exitX, defaultPoint.x);
      const y = parseNum(style.exitY, defaultPoint.y);

      const dx = parseNum(style.exitDx, 0);
      const dy = parseNum(style.exitDy, 0);

      edge.setStart(
        new PointInNodeEndpoint(sourceNode, { x: x, y: y }, { x: dx, y: dy }, 'absolute'),
        uow
      );
    }
  }

  const target = $cell.getAttribute('target')!;
  if (target) {
    const targetNode = diagram.nodeLookup.get(target);
    if (targetNode) {
      const defaultPoint = Point.of(0.5, 0.5);

      const x = parseNum(style.entryX, defaultPoint.x);
      const y = parseNum(style.entryY, defaultPoint.y);

      const dx = parseNum(style.entryDx, 0);
      const dy = parseNum(style.entryDy, 0);

      edge.setEnd(new PointInNodeEndpoint(targetNode, { x, y }, { x: dx, y: dy }, 'absolute'), uow);
    }
  }
};

const readMetadata = ($parent: HTMLElement) => {
  const dest: Record<string, string> = {};
  for (const n of $parent.getAttributeNames()) {
    if (n === 'id' || n === 'label' || n === 'placeholders') continue;

    const value = $parent.getAttribute(n);
    if (value) {
      dest[n] = value;
    }
  }
  return dest;
};

const parseMxGraphModel = async ($el: Element, diagram: Diagram) => {
  const alreadyLoaded = new Set<Loader>();

  const uow = UnitOfWork.immediate(diagram);
  const queue = new WorkQueue();

  const parentChild = new Map<string, string[]>();

  const $cells = $el.getElementsByTagName('root').item(0)!.getElementsByTagName('mxCell');

  const rootId = $cells.item(0)!.getAttribute('id')!;

  // Phase 1 - Determine parent child relationships
  for (let i = 0; i < $cells.length; i++) {
    const $cell = $cells.item(i)!;
    if ($cell.nodeType !== Node.ELEMENT_NODE) continue;

    const parent = $cell.getAttribute('parent')!;
    if (parent !== '0') {
      if (!parentChild.has(parent)) {
        parentChild.set(parent, []);
      }
      if ($cell.getAttribute('style')?.startsWith('edgeLabel;')) continue;

      parentChild.get(parent)!.push($cell.getAttribute('id')!);
    }
  }

  // Phase 2 - process all objects
  const parents = new Map<string, Layer | DiagramNode | DiagramEdge>();
  for (let i = 0; i < $cells.length; i++) {
    const $cell = $cells.item(i)!;
    if ($cell.nodeType !== Node.ELEMENT_NODE) continue;

    const $parent = $cell.parentElement!;
    const isWrappedByObject = $parent!.tagName === 'object' || $parent!.tagName === 'UserObject';

    const parent = $cell.getAttribute('parent')!;
    const id =
      $cell.getAttribute('id')! ?? (isWrappedByObject ? $parent.getAttribute('id') : newid());
    const value = $cell.getAttribute('value')!;

    // Ignore the root
    if (id === rootId) continue;

    // is layer?
    if (parent === rootId) {
      const layer = new Layer(id, value! === '' || !value ? 'Background' : value!, [], diagram);
      diagram.layers.add(layer, uow);
      if ($cell.getAttribute('visible') === '0') {
        diagram.layers.toggleVisibility(layer);
      }

      parents.set(id, layer);
    } else {
      const $geometry = $cell.getElementsByTagName('mxGeometry').item(0)!;
      let bounds = MxGeometry.boundsFrom($geometry);

      let p = parents.get(parent);
      if (!p) {
        const parentNode = diagram.nodeLookup.get(parent);
        if (!parentNode) {
          console.warn(`Parent ${parent} not found for ${id}`);
          continue;
        }

        p = parentNode.layer;
        bounds = {
          ...bounds,
          x: parentNode.bounds.x + bounds.x,
          y: parentNode.bounds.y + bounds.y
        };
      }

      assert.present(p);

      const layer = p instanceof Layer ? p : p!.layer;

      const $style = $cell.getAttribute('style')!;
      const style = parseStyle($style);

      const metadata: ElementMetadata = {};

      const props = getNodeProps(style, $cell.getAttribute('edge') === '1');
      const texts: NodeTexts = {
        text: hasValue(value) ? value : ''
      };

      if (isWrappedByObject) {
        metadata.data ??= {};
        metadata.data.customData = readMetadata($parent);

        texts.text = $parent.getAttribute('label') ?? '';
      }

      if ('rotation' in style) {
        bounds.r = Angle.toRad(parseNum(style.rotation, 0));
      }

      const nodes: DiagramElement[] = [];

      const shape = parseShape(drawioBuiltinShapes[style.shape!] ?? style.shape);

      if (shape) {
        props.custom ??= {};
        props.custom.drawio = { shape: btoa(await decode(shape)) };
        nodes.push(new DiagramNode(id, 'drawio', bounds, diagram, layer, props, metadata, texts));
      } else if ($style.startsWith('text;')) {
        if (!style.strokeColor || style.strokeColor === 'none') {
          props.stroke!.enabled = false;
        }

        if (!style.fillColor || style.fillColor === 'none') {
          props.fill!.enabled = false;
        }

        // There are different defaults for align and valign for a text node

        const align = style.align ?? 'left';
        assertHAlign(align);
        props.text!.align = align;

        const valign = style.verticalAlign ?? 'top';
        assertVAlign(valign);
        props.text!.valign = valign;

        nodes.push(new DiagramNode(id, 'rect', bounds, diagram, layer, props, metadata, texts));
      } else if ($style.startsWith('edgeLabel;')) {
        // Handle free-standing edge labels
        const edge = diagram.edgeLookup.get(parent);
        assert.present(edge);

        const textNode = createLabelNode(id, edge, value, props, '#ffffff', uow);
        nodes.push(textNode);

        // Note: This used to be done with queue.add - unclear why
        attachLabelNode(textNode, edge, $geometry, uow);

        queue.add(() => calculateLabelNodeActualSize(style, textNode, value, uow));
        queue.add(() => edge.invalidate(uow), 1);
      } else if ($cell.getAttribute('edge') === '1') {
        // Handle edge creation

        // First create the node with free endpoints as the position of all connected
        // nodes are not known at this time

        const points = Array.from($geometry.getElementsByTagName('mxPoint')).map($p => ({
          ...MxPoint.pointFrom($p),
          as: $p.getAttribute('as')
        }));

        const source = new FreeEndpoint(points.find(p => p.as === 'sourcePoint') ?? Point.ORIGIN);
        const target = new FreeEndpoint(points.find(p => p.as === 'targetPoint') ?? Point.ORIGIN);

        parseEdgeArrow('start', style, props);

        // Note, apparently the lack of an arrow specified, means by default a
        // classic end arrow is assumed
        if (!style.endArrow) style.endArrow = 'classic';
        parseEdgeArrow('end', style, props);

        const edgeProps = props as EdgeProps;
        edgeProps.routing ??= {};
        edgeProps.stroke!.lineJoin = 'round';

        const isNonCurveEdgeStyle =
          style.edgeStyle === 'orthogonalEdgeStyle' ||
          style.edgeStyle === 'elbowEdgeStyle' ||
          style.edgeStyle === 'isometricEdgeStyle' ||
          style.edgeStyle === 'entityRelationEdgeStyle';

        if (isNonCurveEdgeStyle) {
          edgeProps.type = 'orthogonal';
        }

        if (style.curved === '1') {
          if (isNonCurveEdgeStyle) {
            edgeProps.type = 'curved';
          } else {
            edgeProps.type = 'bezier';
          }
        }

        if (style.shape === 'flexArrow') {
          edgeProps.shape = 'BlockArrow';
          edgeProps.custom ??= {};
          edgeProps.custom.blockArrow = {
            width: parseNum(style.width, 10),
            arrowWidth: parseNum(style.width, 10) + parseNum(style.endWidth, 20),
            arrowDepth: parseNum(style.endSize, 7) * 3
          };
          edgeProps.fill = {
            color: style.fillColor ?? 'none'
          };
          edgeProps.effects = {
            opacity: style.opacity ? parseNum(style.opacity, 100) / 100 : 1
          };
        }

        if (style.rounded === '1') {
          edgeProps.routing!.rounding = 10;
        }

        const waypoints: Waypoint[] = [];
        const wps = Array.from(
          $geometry.getElementsByTagName('Array').item(0)?.getElementsByTagName('mxPoint') ?? []
        ).map($p => MxPoint.pointFrom($p));
        for (let i = 0; i < wps.length; i++) {
          if (edgeProps.type === 'bezier') {
            if (i === wps.length - 1) continue;

            // TODO: Maybe we should apply BezierUtils.qubicFromThreePoints here
            //       ...to smoothen the curve further

            const next = wps[i + 1];
            const midpoint = Line.midpoint(Line.of(wps[i], next));
            waypoints.push({
              point: midpoint,
              controlPoints: {
                cp1: Vector.scale(Point.subtract(wps[i], midpoint), 1),
                cp2: Vector.scale(Point.subtract(wps[i + 1], midpoint), 1)
              }
            });
          } else {
            waypoints.push({ point: wps[i] });
          }
        }

        const edge = new DiagramEdge(
          id,
          source,
          target,
          // @ts-ignore
          props,
          metadata,
          waypoints,
          diagram,
          layer
        );
        nodes.push(edge);
        parents.set(id, edge);

        // Post-pone attaching the edge to the source and target nodes until all
        // nodes have been processed
        queue.add(() => attachEdge(edge, $cell, style, uow));

        const value = isWrappedByObject
          ? $parent.getAttribute('label')
          : $cell.getAttribute('value');

        if (hasValue(value)) {
          props.stroke!.enabled = false;

          const labelBg = style.labelBackgroundColor ?? 'transparent';

          const textNode = createLabelNode(`${id}-label`, edge, value, props, labelBg, uow);
          nodes.push(textNode);

          queue.add(() => attachLabelNode(textNode, edge, $geometry, uow));
          queue.add(() => calculateLabelNodeActualSize(style, textNode, value, uow));
          queue.add(() => edge.invalidate(uow), 1);
        }
      } else if (parentChild.has(id) || 'group' in style) {
        // Handle groups

        let node: DiagramNode;
        if (style.shape === 'table' || style.shape === 'tableRow') {
          const parser = getParser(style.shape!)!;
          node = await parser(id, bounds, props, metadata, texts, style, diagram, layer);
          nodes.push(node);
          // TODO: Support more than stackLayout
        } else if ('swimlane' in style && style.childLayout === 'stackLayout') {
          node = await parseSwimlane(id, bounds, props, metadata, texts, style, diagram, layer);
          nodes.push(node);
        } else {
          node = new DiagramNode(id, 'group', bounds, diagram, layer, props, metadata, texts);
          nodes.push(node);

          if (
            !('group' in style) &&
            (style.fillColor || style.strokeColor || value || style.shape)
          ) {
            // TODO: This is all a bit duplication - we should refactor this
            let bgNode: DiagramNode;
            if (style.shape! in shapeParsers) {
              bgNode = await shapeParsers[style.shape!](
                newid(),
                bounds,
                props,
                metadata,
                texts,
                style,
                diagram,
                layer
              );
            } else if (style.shape?.startsWith('mxgraph.')) {
              const registry = diagram.document.nodeDefinitions;

              const loader = getLoader(style.shape);
              if (!loader) {
                console.warn(`No loader found for ${style.shape}`);
                nodes.push(
                  new DiagramNode(id, 'rect', bounds, diagram, layer, props, metadata, texts)
                );
                continue;
              }

              if (!registry.hasRegistration(style.shape)) {
                await load(loader, registry, alreadyLoaded);
              }

              const parser = getParser(style.shape!);
              if (parser) {
                bgNode = await parser(
                  newid(),
                  bounds,
                  props,
                  metadata,
                  texts,
                  style,
                  diagram,
                  layer
                );
              } else {
                bgNode = new DiagramNode(
                  newid(),
                  style.shape!,
                  bounds,
                  diagram,
                  layer,
                  props,
                  metadata,
                  texts
                );
              }
            } else {
              if (style.rounded === '1') {
                bgNode = new DiagramNode(
                  newid(),
                  'rounded-rect',
                  { ...bounds },
                  diagram,
                  layer,
                  props,
                  metadata,
                  texts
                );
              } else {
                bgNode = new DiagramNode(
                  newid(),
                  'rect',
                  { ...bounds },
                  diagram,
                  layer,
                  props,
                  metadata,
                  texts
                );
              }
            }

            node.addChild(bgNode, uow);
            queue.add(() => {
              bgNode.setBounds(node.bounds, uow);
            });
          }
        }

        parents.set(id, node);
      } else if ('triangle' in style) {
        nodes.push(await parseTriangle(id, bounds, props, metadata, texts, style, diagram, layer));
      } else if ('image' in style) {
        nodes.push(await parseImage(id, bounds, props, metadata, texts, style, diagram, layer));
      } else if ('line' in style) {
        nodes.push(await parseLine(id, bounds, props, metadata, texts, style, diagram, layer));
      } else if (style.shape! in shapeParsers) {
        nodes.push(
          await shapeParsers[style.shape!](
            id,
            bounds,
            props,
            metadata,
            texts,
            style,
            diagram,
            layer
          )
        );
      } else if (style.shape?.startsWith('mxgraph.') || !!getLoader(style.shape)) {
        const registry = diagram.document.nodeDefinitions;

        const loader = getLoader(style.shape);
        if (!loader) {
          console.warn(`No loader found for ${style.shape}`);
          nodes.push(new DiagramNode(id, 'rect', bounds, diagram, layer, props, metadata, texts));
          continue;
        }

        if (!registry.hasRegistration(style.shape!)) {
          await load(loader, registry, alreadyLoaded);
        }

        let newBounds = { ...bounds };
        if (style.direction === 'south') {
          const p = Point.rotateAround(
            Point.add(newBounds, { x: 0, y: newBounds.w }),
            Math.PI / 2,
            Point.add(newBounds, { x: newBounds.h / 2, y: newBounds.w / 2 })
          );

          newBounds = {
            ...newBounds,
            w: newBounds.h,
            h: newBounds.w,
            r: Math.PI / 2,
            x: newBounds.x + (newBounds.x - p.x),
            y: newBounds.y + (newBounds.y - p.y)
          };
        } else if (style.direction === 'north') {
          const p = Point.rotateAround(
            Point.add(newBounds, { x: newBounds.h, y: 0 }),
            -Math.PI / 2,
            Point.add(newBounds, { x: newBounds.h / 2, y: newBounds.w / 2 })
          );

          newBounds = {
            ...newBounds,
            w: newBounds.h,
            h: newBounds.w,
            r: -Math.PI / 2,
            x: newBounds.x + (newBounds.x - p.x),
            y: newBounds.y + (newBounds.y - p.y)
          };
        } else if (style.direction === 'west') {
          newBounds = { ...newBounds, r: Math.PI };
        }

        const parser = getParser(style.shape!);
        if (parser) {
          nodes.push(await parser(id, newBounds, props, metadata, texts, style, diagram, layer));
        } else {
          nodes.push(
            new DiagramNode(id, style.shape!, newBounds, diagram, layer, props, metadata, texts)
          );
        }
      } else if ('ellipse' in style) {
        nodes.push(await parseEllipse(id, bounds, props, metadata, texts, style, diagram, layer));
      } else if ('rhombus' in style) {
        nodes.push(await parseDiamond(id, bounds, props, metadata, texts, style, diagram, layer));
      } else {
        if (style.rounded === '1') {
          nodes.push(
            await parseRoundedRect(id, bounds, props, metadata, texts, style, diagram, layer)
          );
        } else {
          nodes.push(new DiagramNode(id, 'rect', bounds, diagram, layer, props, metadata, texts));
        }
      }

      // Attach all nodes created to their parent (group and/or layer)
      for (const node of nodes) {
        if (p instanceof DiagramNode) {
          // Need to offset the bounds according to the parent

          const offsetPoint = $geometry.querySelector('mxPoint[as=offset]');

          // TODO: Unclear why the `&& offsetPoint` condition - needed by test6
          const isRelative = $geometry.getAttribute('relative') === '1' && offsetPoint;

          const newBounds = {
            x:
              (isRelative ? node.bounds.x * p.bounds.w : node.bounds.x) +
              p.bounds.x +
              (offsetPoint ? xNum(offsetPoint, 'x', 0) : 0),
            y:
              (isRelative ? node.bounds.y * p.bounds.h : node.bounds.y) +
              p.bounds.y +
              (offsetPoint ? xNum(offsetPoint, 'y', 0) : 0),
            w: node.bounds.w,
            h: node.bounds.h,
            r: node.bounds.r
          };

          node.setBounds(newBounds, uow);

          if (node instanceof DiagramEdge) {
            const edge = node as DiagramEdge;
            edge.waypoints.forEach(wp => {
              edge.moveWaypoint(wp, Point.add(p.bounds, wp.point), uow);
            });
          }

          if (node.editProps.fill?.color === 'inherit') {
            node.updateProps(props => {
              props.fill!.color = p.renderProps.fill!.color;
            }, uow);
          }
          if (node.editProps.stroke?.color === 'inherit') {
            node.updateProps(props => {
              props.stroke!.color = p.renderProps.stroke!.color;
            }, uow);
          }

          // This needs to be deferred as adding children changes the bounds of the group
          // meaning adding additional children will have the wrong parent bounds to resolve
          // the group local coordinates
          queue.add(() => p.setChildren([...p.children, node], uow));
        } else {
          layer.addElement(node, uow);
        }
      }
    }
  }

  // Phase 3 - run all remaining tasks
  queue.run();
};

async function decode(data: string) {
  const binaryContents = atob(data);

  const arr = Uint8Array.from(binaryContents, c => c.charCodeAt(0));

  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(arr);
  writer.close();

  const reader = ds.readable.getReader();
  const output = [];

  let totalSize = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    output.push(value);
    totalSize += value.byteLength;
  }

  const concatenated = new Uint8Array(totalSize);
  let offset = 0;
  for (const array of output) {
    concatenated.set(array, offset);
    offset += array.byteLength;
  }

  return decodeURIComponent(new TextDecoder().decode(concatenated));
}

export const drawioReader = async (
  contents: string,
  documentFactory: DocumentFactory,
  // @ts-ignore
  diagramFactor: DiagramFactory<Diagram>
): Promise<DiagramDocument> => {
  const start = new Date().getTime();

  const doc = documentFactory();

  const parser = new DOMParser();
  const $doc = parser.parseFromString(contents, 'application/xml');

  const $diagrams = $doc.getElementsByTagName('diagram');

  for (let i = 0; i < $diagrams.length; i++) {
    const $diagram = $diagrams.item(i)!;

    let $mxGraphModel: Element;
    if (
      $diagram.childNodes.length === 1 &&
      $diagram.childNodes.item(0).nodeType === Node.TEXT_NODE
    ) {
      const s = await decode($diagram.textContent!);
      $mxGraphModel = parser.parseFromString(s, 'application/xml').documentElement;
    } else {
      $mxGraphModel = $diagram.getElementsByTagName('mxGraphModel').item(0)!;
    }

    const diagram = new Diagram($diagram.getAttribute('id')!, $diagram.getAttribute('name')!, doc);
    doc.addDiagram(diagram);

    await parseMxGraphModel($mxGraphModel, diagram);

    if (diagram.visibleElements().length > 0) {
      const bounds = Box.boundingBox(diagram.visibleElements().map(e => e.bounds));

      const pageWidth = xNum($mxGraphModel, 'pageWidth', 100);
      const pageHeight = xNum($mxGraphModel, 'pageHeight', 100);

      const canvasBounds = {
        w: pageWidth,
        h: pageHeight,
        x: 0,
        y: 0
      };

      while (bounds.x < canvasBounds.x) canvasBounds.x -= pageWidth;
      while (bounds.y < canvasBounds.y) canvasBounds.y -= pageHeight;
      while (bounds.x + bounds.w > canvasBounds.x + canvasBounds.w) canvasBounds.w += pageWidth;
      while (bounds.y + bounds.h > canvasBounds.y + canvasBounds.h) canvasBounds.h += pageHeight;

      diagram.canvas = canvasBounds;

      diagram.viewBox.offset = { x: 0, y: 0 };
      diagram.viewBox.zoomLevel = xNum($mxGraphModel, 'pageScale', 1);
    }
  }

  console.log(`Duration: ${new Date().getTime() - start}`);

  return doc;
};
