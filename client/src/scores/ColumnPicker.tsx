import { faTableColumns } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Checkbox } from "../components/Checkbox";
import { Menu } from "../components/Menu";
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

/** A button that opens a list of columns to show or hide. */
export function ColumnPicker({ columns, visibleColumnIds, onToggle }: ColumnPickerProps) {
    return (
        <Menu
            trigger={
                <>
                    <FontAwesomeIcon icon={faTableColumns} />
                    Columns
                </>
            }
            items={[]}
            footer={
                <div className={styles.list}>
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
            }
        />
    );
}
