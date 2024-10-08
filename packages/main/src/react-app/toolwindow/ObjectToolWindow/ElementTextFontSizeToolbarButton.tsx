import { useNodeProperty } from '../../hooks/useProperty';
import { Select } from '@diagram-craft/app-components/Select';
import { useDiagram } from '../../../application';

const SIZES = {
  '10px': 10,
  '12px': 12,
  '14px': 14,
  '16px': 16,
  '18px': 18,
  '20px': 20,
  '24px': 24,
  '30px': 30,
  '36px': 36,
  '48px': 48,
  '64px': 64,
  '72px': 72,
  '96px': 96
};

export const ElementTextFontSizeToolbarButton = (_props: Props) => {
  const $d = useDiagram();
  const fontSize = useNodeProperty($d, 'text.fontSize');

  return (
    <Select.Root value={fontSize.val.toString()} onChange={a => fontSize.set(Number(a))}>
      {Object.entries(SIZES).map(([k, v]) => (
        <Select.Item key={v.toString()} value={v.toString()}>
          {k}
        </Select.Item>
      ))}
    </Select.Root>
  );
};

interface Props {
  value?: string;
  //  onValueChange: (value: string | undefined) => void;
}
