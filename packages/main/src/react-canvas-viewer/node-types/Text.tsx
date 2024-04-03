import { ReactNodeProps } from '../reactNodeDefinition.ts';
import { useComponent } from '../temp/useComponent.temp.ts';
import { TextComponent } from './Text.nodeType.ts';

export const Text = (props: Props) => {
  const ref = useComponent(() => new TextComponent(), {
    // @ts-ignore
    style: props.style!,
    node: props.node,
    // @ts-ignore
    onMouseDown: props.onMouseDown!,
    nodeProps: props.nodeProps,
    isSingleSelected: props.isSingleSelected,
    tool: props.tool
  });

  return <g ref={ref} />;
};

type Props = ReactNodeProps<SVGRectElement>;
