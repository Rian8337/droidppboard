import { faTableColumns } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Button } from "../components/Button";
import { Checkbox } from "../components/Checkbox";
import styles from "./ColumnPicker.module.css";

export interface PickableColumn {
    id: string;
    header: string;
}

export interface ColumnPickerProps {
    columns: PickableColumn[];
    visibleColumnIds: string[];
    onToggle: (columnId: string) => void;
}

/** A button that discloses a list of columns to show or hide. Escape or a press outside closes it. */
export function ColumnPicker({ columns, visibleColumnIds, onToggle }: ColumnPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const panelId = useId();

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function closeOnOutsidePress(event: PointerEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("pointerdown", closeOnOutsidePress);

        return () => document.removeEventListener("pointerdown", closeOnOutsidePress);
    }, [isOpen]);

    function closeOnEscape(event: KeyboardEvent) {
        if (isOpen && event.key === "Escape") {
            setIsOpen(false);
            rootRef.current?.querySelector("button")?.focus();
        }
    }

    return (
        <div ref={rootRef} className={styles.picker} onKeyDown={closeOnEscape}>
            <Button
                variant="secondary"
                aria-expanded={isOpen}
                aria-controls={isOpen ? panelId : undefined}
                onClick={() => setIsOpen(!isOpen)}
            >
                <FontAwesomeIcon icon={faTableColumns} /> Columns
            </Button>
            {isOpen && (
                <div id={panelId} role="group" aria-label="Columns" className={styles.panel}>
                    {columns.map((column) => (
                        <Checkbox
                            key={column.id}
                            checked={visibleColumnIds.includes(column.id)}
                            onChange={() => onToggle(column.id)}
                        >
                            {column.header}
                        </Checkbox>
                    ))}
                </div>
            )}
        </div>
    );
}
