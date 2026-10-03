import { useEffect, useState } from 'react';
import { parseAmount } from '../lib/format';

interface Props {
  value: number | null;
  onChange: (v: number | null) => void;
  label: string;
  placeholder?: string;
  autoFocus?: boolean;
}

/** Numeric field that keeps its own text while typing and commits a number on change. */
export function AmountInput({ value, onChange, label, placeholder = '____', autoFocus }: Props) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => {
    setText((t) => (parseAmount(t) === value ? t : value == null ? '' : String(value)));
  }, [value]);
  return (
    <label className="amount">
      <span className="amount-sign">₪</span>
      <input
        inputMode="decimal"
        aria-label={label}
        placeholder={placeholder}
        value={text}
        autoFocus={autoFocus}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseAmount(e.target.value));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
    </label>
  );
}
