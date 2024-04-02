import { ReactNodeProps } from '../reactNodeDefinition.ts';
import { useComponent } from '../temp/useComponent.temp.ts';
import { RectComponent } from './Rect.nodeType.ts';

export const Rect = (props: Props) => {
  const ref = useComponent(() => new RectComponent(), {
    // @ts-ignore
    style: props.style!,
    node: props.node,
    onMouseDown: props.onMouseDown!,
    nodeProps: props.nodeProps
  });

  return <g ref={ref} />;
};

type Props = ReactNodeProps;
