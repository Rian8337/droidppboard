import { faSort, faSortDown, faSortUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useLayoutEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import styles from "./DataTable.module.css";

export interface Column<Row> {
    id: string;
    header: string;
    render: (row: Row) => ReactNode;
    isSortable?: boolean;
    align?: "left" | "right";
}

export interface SortState {
    columnId: string;
    direction: "ascending" | "descending";
}

export interface DataTableProps<Row> {
    columns: Column<Row>[];
    rows: Row[];
    rowKey: (row: Row) => string;
    sort?: SortState;
    onSortChange?: (sort: SortState) => void;
    /** Columns that stay in view while the table scrolls sideways. Put them first, in column order. */
    pinnedColumnIds?: string[];
    onRowClick?: (row: Row) => void;
    emptyText: string;
}

/**
 * Writes each pinned column's left offset (the widths of the pinned columns before it) as `--pin-<n>`.
 * The widths are exact and the offset rounds down, so a pinned column overlaps the one before it by
 * under a pixel rather than leaving a gap that the scrolled columns show through.
 */
function measurePinnedOffsets(table: HTMLTableElement) {
    let width = 0;

    table.querySelectorAll<HTMLElement>("thead th[data-pinned]").forEach((header, index) => {
        table.style.setProperty(`--pin-${index}`, `${Math.floor(width)}px`);
        width += header.getBoundingClientRect().width;
    });
}

/**
 * A table that scrolls sideways inside its own wrapper, so the page never does. Sortable headers report the
 * requested sort and the parent applies it; a column's first sort is descending, and sorting it again flips it.
 */
export function DataTable<Row>({
    columns,
    rows,
    rowKey,
    sort,
    onSortChange,
    pinnedColumnIds = [],
    onRowClick,
    emptyText,
}: DataTableProps<Row>) {
    const tableRef = useRef<HTMLTableElement>(null);
    const pinnedKey = columns
        .filter((column) => pinnedColumnIds.includes(column.id))
        .map((column) => column.id)
        .join();

    useLayoutEffect(() => {
        const table = tableRef.current;

        if (!table || pinnedKey === "") {
            return;
        }

        measurePinnedOffsets(table);

        if (typeof ResizeObserver === "undefined") {
            return;
        }

        const observer = new ResizeObserver(() => measurePinnedOffsets(table));
        table
            .querySelectorAll("thead th[data-pinned]")
            .forEach((header) => observer.observe(header, { box: "border-box" }));

        return () => observer.disconnect();
    }, [pinnedKey]);

    function getPinIndex(column: Column<Row>): number {
        return columns
            .filter((candidate) => pinnedColumnIds.includes(candidate.id))
            .indexOf(column);
    }

    function getCellProps(column: Column<Row>) {
        const pinIndex = getPinIndex(column);
        const isPinned = pinIndex !== -1;

        return {
            className: [
                styles.cell,
                column.align === "right" ? styles.right : "",
                isPinned ? styles.pinned : "",
            ]
                .filter(Boolean)
                .join(" "),
            "data-pinned": isPinned ? "true" : undefined,
            style: isPinned ? { left: `var(--pin-${pinIndex}, 0px)` } : undefined,
        };
    }

    function requestSort(column: Column<Row>) {
        const isSortedAlready = sort?.columnId === column.id;

        onSortChange?.({
            columnId: column.id,
            direction:
                isSortedAlready && sort.direction === "descending" ? "ascending" : "descending",
        });
    }

    function handleRowKeyDown(event: KeyboardEvent, row: Row) {
        if (event.key === "Enter" && event.target === event.currentTarget) {
            onRowClick?.(row);
        }
    }

    return (
        <div className={styles.wrapper}>
            <table ref={tableRef} className={styles.table}>
                <thead>
                    <tr>
                        {columns.map((column) => {
                            const isSorted = sort?.columnId === column.id;

                            return (
                                <th
                                    key={column.id}
                                    scope="col"
                                    aria-sort={isSorted ? sort.direction : undefined}
                                    {...getCellProps(column)}
                                >
                                    {column.isSortable ? (
                                        <button
                                            type="button"
                                            className={styles.sortButton}
                                            onClick={() => requestSort(column)}
                                        >
                                            {column.header}
                                            <FontAwesomeIcon
                                                icon={
                                                    isSorted
                                                        ? sort.direction === "ascending"
                                                            ? faSortUp
                                                            : faSortDown
                                                        : faSort
                                                }
                                                className={
                                                    isSorted ? styles.sortActive : styles.sortIdle
                                                }
                                            />
                                        </button>
                                    ) : (
                                        column.header
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className={styles.empty}>
                                {emptyText}
                            </td>
                        </tr>
                    ) : (
                        rows.map((row) => (
                            <tr
                                key={rowKey(row)}
                                className={onRowClick ? styles.clickable : undefined}
                                tabIndex={onRowClick ? 0 : undefined}
                                onClick={onRowClick && (() => onRowClick(row))}
                                onKeyDown={onRowClick && ((event) => handleRowKeyDown(event, row))}
                            >
                                {columns.map((column) => (
                                    <td key={column.id} {...getCellProps(column)}>
                                        {column.render(row)}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
