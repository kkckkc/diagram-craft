import { parseNum } from './utils';

const STYLENAME_KEY = '_stylename';

type StringKey =
  | typeof STYLENAME_KEY
  | '_textPosition'
  | 'labelPosition'
  | 'fontFamily'
  | 'align'
  | 'verticalAlign'
  | 'fontColor'
  | 'fillColor'
  | 'shape'
  | 'fontStyle'
  | 'gradientColor'
  | 'gradientDirection'
  | 'strokeColor'
  | 'dashPattern'
  | 'labelBackgroundColor'
  | 'labelBorderColor'
  | 'endArrow'
  | 'edgeStyle'
  | 'childLayout'
  | 'image'
  | 'direction'
  | 'resIcon'
  | 'grStroke'
  | 'grIcon'
  | 'prIcon'
  | 'label'
  | 'imageHeight'
  | 'imageWidth'
  | 'imageBorder'
  | 'imageBackground'
  | 'imageAlign'
  | 'imageVerticalAlign'
  | 'participant'
  | 'overflow'
  | 'whiteSpace';

type BooleanKey =
  | 'rounded'
  | 'shadow'
  | 'flipH'
  | 'flipV'
  | 'sketch'
  | 'dashed'
  | 'curved'
  | 'top'
  | 'left'
  | 'right'
  | 'bottom'
  | 'imageAspect'
  | 'imageFlipV'
  | 'imageFlipH'
  | 'noLabel'
  | 'absoluteArcSize';

type NumKey =
  | '_margin'
  | 'textOpacity'
  | 'arcSize'
  | 'exitX'
  | 'exitY'
  | 'exitDx'
  | 'exitDy'
  | 'entryX'
  | 'entryY'
  | 'entryDx'
  | 'entryDy'
  | 'fontSize'
  | 'spacingTop'
  | 'spacingBottom'
  | 'spacing'
  | 'spacingRight'
  | 'spacingLeft'
  | 'opacity'
  | 'strokeWidth'
  | 'rotation'
  | 'width'
  | 'endWidth'
  | 'endSize'
  | 'dx1'
  | 'dx2'
  | 'dy'
  | 'dx'
  | 'size'
  | 'startSize'
  | 'arcWidth'
  | 'endAngle'
  | 'startAngle'
  | 'notch'
  | 'jettyHeight'
  | 'jettyWidth';

type AllKeys = StringKey | BooleanKey | NumKey;

type Style = Partial<Record<AllKeys, string>>;

export class StyleManager {
  defaults: Partial<Record<string, Style>> & { default: Style } = {
    default: {
      _margin: '0',
      _textPosition: 'bottom',
      imageWidth: '100%',
      imageHeight: '100%',
      imageAlign: 'left',
      imageVerticalAlign: 'middle',
      spacing: '2',
      spacingLeft: '0',
      spacingRight: '0',
      spacingTop: '5',
      spacingBottom: '5',
      align: 'center',
      verticalAlign: 'middle',
      overflow: 'visible',
      whiteSpace: 'noWrap'
    },
    image: {
      _margin: '0',
      _textPosition: 'bottom',
      imageWidth: '100%',
      imageHeight: '100%',
      imageAlign: 'left'
    },
    label: {
      _margin: '8',
      _textPosition: 'center',
      imageWidth: '42',
      imageHeight: '42',
      imageAlign: 'left',
      fontSize: '12',
      fontStyle: '1',
      verticalAlign: 'middle'
    },
    icon: {
      _margin: '0',
      _textPosition: 'bottom',
      imageWidth: '48',
      imageHeight: '48',
      imageAlign: 'center'
    },
    text: {
      spacingTop: '0',
      spacingBottom: '0',
      align: 'left',
      verticalAlign: 'top'
    }
  };
  styleName: string;
  shape: string | undefined;
  styles: Style;

  constructor(styleString: string) {
    this.styles = this.parseStyle(styleString);
    this.styleName = this.styles[STYLENAME_KEY] ?? 'default';

    this.shape = this.get('shape');
  }

  private parseStyle(style: string) {
    const parts = style.split(';');
    const result: Style = {};
    for (const part of parts) {
      const [key, ...value] = part.split('=');
      if (key === '') continue;

      result[key as AllKeys] = value.join('=');

      if (value.length === 0) {
        result[STYLENAME_KEY] = key;
      }
    }
    return result;
  }

  is(key: BooleanKey, def: boolean = false) {
    return !this.has(key) ? def : this.get(key) === '1';
  }

  str(key: StringKey): string | undefined;
  str(key: StringKey, def: string): string;
  str(key: StringKey, def?: string | undefined): string | undefined {
    return this.get(key) ?? def;
  }

  num(key: NumKey, def = 0) {
    return parseNum(this.get(key), def);
  }

  get(key: string) {
    return (
      this.styles[key as AllKeys] ??
      this.defaults[this.styleName]?.[key as AllKeys] ??
      this.defaults['default'][key as AllKeys]
    );
  }

  set(key: string, value: string) {
    this.styles[key as AllKeys] = value;
  }

  // TODO: This is a bad implementation
  has(key: AllKeys) {
    return /*this.get(key) !== undefined; // */ key in this.styles;
  }
}
