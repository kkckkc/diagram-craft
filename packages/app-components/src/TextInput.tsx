import React, { ChangeEvent, useRef, useState } from 'react';
import { propsUtils } from '@diagram-craft/utils/propsUtils';
import { extractDataAttributes } from './utils';
import styles from './TextInput.module.css';

export const TextInput = React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  const [error, setError] = useState(false);
  const [origValue, setOrigValue] = useState(props.value.toString());
  const [currentValue, setCurrentValue] = useState(props.value.toString());
  const hasFocus = useRef(false);

  if (origValue !== props.value.toString() && !hasFocus.current && !props.isIndeterminate) {
    setOrigValue(props.value.toString());
    setCurrentValue(props.value.toString());
  }

  return (
    <div
      className={styles.cmpTextInput}
      {...extractDataAttributes(props)}
      data-error={error}
      data-field-state={props.isIndeterminate ? 'indeterminate' : props.state}
      style={props.style ?? {}}
    >
      {props.label && <div className={styles.cmpTextInputLabel}>{props.label}</div>}
      <input
        ref={ref}
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
        }}
        onChange={ev => {
          const p = ev.target.value;
          setCurrentValue(p);

          if (ev.target.value === '') {
            setError(false);
            props.onChange?.(undefined, ev);
            return;
          }

          if (!p) {
            setError(true);
            return;
          }

          setError(false);
          props.onChange?.(p, ev);
          return;
        }}
        {...extractDataAttributes(props)}
      />
    </div>
  );
});

type Props = {
  value: string | number;
  label?: string;
  isIndeterminate?: boolean;
  state?: 'set' | 'unset' | 'overridden';
  onChange?: (value: string | undefined, ev: ChangeEvent<HTMLInputElement>) => void;
} & Omit<
  React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>,
  'onChange' | 'value'
>;
