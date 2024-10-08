import { TbChevronDown, TbChevronUp } from 'react-icons/tb';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { propsUtils } from '@diagram-craft/utils/propsUtils';
import { extractDataAttributes } from './utils';
import styles from './NumberInput.module.css';

type UnitAndValue = [string, string | undefined];

const parseNumberAndUnit = (value: string): UnitAndValue | undefined => {
  const m = value.match(/^ ?(-?\d+\.?\d*) ?([^ ]*)$/);
  if (!m) return undefined;
  if (m[2] === '') return [m[1], undefined];
  return [m[1], m[2]];
};

const formatValue = (value: string, defaultUnit: string | undefined, fallback: string) => {
  const [number, unit] = parseNumberAndUnit(value) ?? [];
  return number ? `${number} ${unit ?? defaultUnit ?? ''}` : fallback;
};

let idx = 0;

const AdjustButton = (props: {
  className: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const mouseDown = () => {
      idx = 0;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        idx++;

        // A little bit slower in the beginning
        if (idx < 10 && idx % 2 === 0) return;

        props.onClick();
      }, 50);
    };
    const mouseUp = () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };

    const btn = btnRef.current!;
    btn.addEventListener('mousedown', mouseDown);
    btn.addEventListener('mouseup', mouseUp);
    btn.addEventListener('mouseleave', mouseUp);
    return () => {
      btn.removeEventListener('mousedown', mouseDown);
      btn.removeEventListener('mouseup', mouseUp);
      btn.removeEventListener('mouseleave', mouseUp);
    };
  }, [btnRef, props, props.onClick]);

  return (
    <button ref={btnRef} className={props.className} disabled={props.disabled}>
      {props.children}
    </button>
  );
};

export const NumberInput = (props: Props) => {
  const [error, setError] = useState(false);
  const [origValue, setOrigValue] = useState(props.value.toString());
  const [currentValue, setCurrentValue] = useState(
    formatValue(props.value.toString(), props.defaultUnit, props.value.toString())
  );
  const hasFocus = useRef(false);

  const updateCurrentValue = useCallback(() => {
    setCurrentValue(formatValue(props.value.toString(), props.defaultUnit, currentValue));
  }, [props.value, props.defaultUnit, currentValue]);

  const adjust = useCallback(
    (delta: number) => {
      setCurrentValue(prev => {
        const p = parseNumberAndUnit(prev);
        if (!p) return prev;

        const newValue = parseFloat(p[0]!) + delta;

        if (props.min !== undefined && newValue < Number(props.min)) return prev;
        if (props.max !== undefined && newValue > Number(props.max)) return prev;

        const newUnit = p[1] ?? props.defaultUnit;

        setTimeout(() => props.onChange(newValue, newUnit), 0);
        return newValue.toString() + ' ' + (newUnit ?? '');
      });
    },
    [props]
  );

  if (origValue !== props.value.toString() && !hasFocus.current && !props.isIndeterminate) {
    setOrigValue(props.value.toString());
    updateCurrentValue();
  }

  return (
    <div
      className={styles.cmpNumberInput} /*$c('cmp-number-input', { error: error })}*/
      {...extractDataAttributes(props)}
      data-error={error}
      data-field-state={props.isIndeterminate ? 'indeterminate' : props.state}
      style={props.style ?? {}}
    >
      {props.label && <div className={styles.cmpNumberInputLabel}>{props.label}</div>}
      <input
        {...propsUtils.filterDomProperties(props)}
        placeholder={props.isIndeterminate ? '···' : undefined}
        type={'text'}
        value={props.isIndeterminate ? '' : currentValue}
        disabled={props.disabled}
        onFocus={() => {
          hasFocus.current = true;
        }}
        onBlur={() => {
          hasFocus.current = true;
          updateCurrentValue();
        }}
        onChange={ev => {
          const p = parseNumberAndUnit(ev.target.value);
          setCurrentValue(ev.target.value);

          if (ev.target.value === '') {
            setError(false);
            props.onChange(undefined);
            return;
          }

          if (!p) {
            setError(true);
            return;
          }

          setError(false);
          props.onChange(parseFloat(p[0]!), p[1] ?? props.defaultUnit);
          return;
        }}
        {...extractDataAttributes(props)}
      />
      <AdjustButton
        className={styles.cmpNumberInputBtnUp}
        disabled={props.disabled}
        onClick={() => adjust(props.step ? Number(props.step) : 1)}
      >
        <TbChevronUp size={'11px'} />
      </AdjustButton>
      <AdjustButton
        className={styles.cmpNumberInputBtnDown}
        disabled={props.disabled}
        onClick={() => adjust(props.step ? -1 * Number(props.step) : -1)}
      >
        <TbChevronDown size={'11px'} />
      </AdjustButton>
    </div>
  );
};

type Props = {
  validUnits?: string[];
  defaultUnit?: string;
  value: string | number;
  label?: string;
  isIndeterminate?: boolean;
  state?: 'set' | 'unset' | 'overridden';
  onChange: (value: number | undefined, unit?: string) => void;
} & Omit<
  React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
  'onChange' | 'value'
>;
