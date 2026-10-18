import { faDownload, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ReactNode } from "react";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { ColumnPicker, type ColumnPickerProps } from "./ColumnPicker";
import styles from "./ScoreToolbar.module.css";

export interface ScoreToolbarProps extends ColumnPickerProps {
    search: string;
    onSearchChange: (search: string) => void;
    onExport: () => void;

    /** The mod filter, placed between the search and the Columns button. */
    modFilter?: ReactNode;
}

/** The controls above a score table: map search, mod filter, column picker and CSV export. */
export function ScoreToolbar({
    search,
    onSearchChange,
    onExport,
    modFilter,
    ...pickerProps
}: ScoreToolbarProps) {
    return (
        <div className={styles.toolbar}>
            <TextField
                type="search"
                className={styles.search}
                aria-label="Search map"
                placeholder="Search map"
                icon={<FontAwesomeIcon icon={faMagnifyingGlass} />}
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
            />
            {modFilter}
            <ColumnPicker {...pickerProps} />
            <Button variant="secondary" onClick={onExport}>
                <FontAwesomeIcon icon={faDownload} /> Export to CSV
            </Button>
        </div>
    );
}
