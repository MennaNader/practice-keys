import { ROOTS, pretty } from "./theory";

interface RootPickerProps {
  value: number;
  onChange: (pc: number) => void;
  label: string;
}

/** The 12 notes as a row of toggle buttons. */
export function RootPicker({ value, onChange, label }: RootPickerProps) {
  return (
    <div className="field">
      <span className="field-label" id={`lbl-${label}`}>{label}</span>
      <div className="chips" role="group" aria-labelledby={`lbl-${label}`}>
        {ROOTS.map((r) => (
          <button
            key={r.pc}
            type="button"
            className={`chip ${r.pc === 1 || r.pc === 3 || r.pc === 6 || r.pc === 8 || r.pc === 10 ? "dark" : ""}`}
            aria-pressed={value === r.pc}
            onClick={() => onChange(r.pc)}
          >
            {pretty(r.name)}
          </button>
        ))}
      </div>
    </div>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}

export function Segmented<T extends string>({ value, options, onChange, label }: SegmentedProps<T>) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
