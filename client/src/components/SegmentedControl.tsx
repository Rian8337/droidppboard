import styles from "./SegmentedControl.module.css";

export interface SegmentedOption<Value extends string> {
    value: Value;
    label: string;
}

export interface SegmentedControlProps<Value extends string> {
    options: SegmentedOption<Value>[];
    value: Value;
    onChange: (value: Value) => void;
    /** Names the group for assistive technology. */
    label: string;
}

/** A small either/or switch where exactly one option is selected. */
export function SegmentedControl<Value extends string>({
    options,
    value,
    onChange,
    label,
}: SegmentedControlProps<Value>) {
    return (
        <div role="radiogroup" aria-label={label} className={styles.control}>
            {options.map((option) => {
                const isSelected = option.value === value;

                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={
                            isSelected ? `${styles.option} ${styles.selected}` : styles.option
                        }
                        onClick={() => onChange(option.value)}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
