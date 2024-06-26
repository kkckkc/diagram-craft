import * as Slider from '@radix-ui/react-slider';
import { NumberInput } from './NumberInput';

export const SliderAndNumberInput = (props: Props) => {
  return (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <Slider.Root
        className="cmp-slider"
        defaultValue={[props.value]}
        value={[props.value]}
        max={props.max ?? 100}
        step={1}
        onValueChange={v => props.onChange(v[0])}
      >
        <Slider.Track className="cmp-slider__track">
          <Slider.Range className="cmp-slider__range" />
        </Slider.Track>
        <Slider.Thumb className="cmp-slider__thumb" aria-label="Volume" />
      </Slider.Root>

      <NumberInput
        defaultUnit={props.unit ?? '%'}
        value={props.value}
        min={0}
        max={100}
        style={{ width: '50px' }}
        onChange={props.onChange}
      />
    </div>
  );
};

type Props = {
  value: number;
  max?: number;
  unit?: string;
  onChange: (value: number | undefined) => void;
};
