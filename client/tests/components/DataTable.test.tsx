import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, type Column, type SortState } from "../../src/components/DataTable";

interface Row {
    id: string;
    name: string;
    pp: number;
}

const columns: Column<Row>[] = [
    { id: "name", header: "Player", render: (row) => row.name },
    { id: "pp", header: "pp", render: (row) => row.pp, isSortable: true, align: "right" },
];

const rows: Row[] = [
    { id: "1", name: "mrekk", pp: 32333 },
    { id: "2", name: "Ivaxa", pp: 30513 },
];

describe("DataTable", () => {
    it("renders a row per item", () => {
        render(
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                emptyText="No players"
            />,
        );

        expect(screen.getAllByRole("row")).toHaveLength(3);
        expect(screen.getByText("mrekk")).toBeInTheDocument();
    });

    it("renders emptyText when there are no rows", () => {
        render(
            <DataTable
                columns={columns}
                rows={[]}
                rowKey={(row) => row.id}
                emptyText="No players"
            />,
        );

        expect(screen.getByText("No players")).toBeInTheDocument();
    });

    it("starts a sortable column descending", async () => {
        const onSortChange = vi.fn();

        render(
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                emptyText="No players"
                onSortChange={onSortChange}
            />,
        );

        await userEvent.click(screen.getByRole("button", { name: "pp" }));

        expect(onSortChange).toHaveBeenCalledWith({ columnId: "pp", direction: "descending" });
    });

    it("toggles the direction of the column already sorted", async () => {
        const onSortChange = vi.fn();
        const sort: SortState = { columnId: "pp", direction: "descending" };

        render(
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                emptyText="No players"
                sort={sort}
                onSortChange={onSortChange}
            />,
        );

        expect(screen.getByRole("columnheader", { name: "pp" })).toHaveAttribute(
            "aria-sort",
            "descending",
        );

        await userEvent.click(screen.getByRole("button", { name: "pp" }));

        expect(onSortChange).toHaveBeenCalledWith({ columnId: "pp", direction: "ascending" });
    });

    it("gives unsortable headers no button", () => {
        render(
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                emptyText="No players"
            />,
        );

        expect(screen.queryByRole("button", { name: "Player" })).not.toBeInTheDocument();
    });

    it("calls onRowClick with the row, by click or Enter", async () => {
        const onRowClick = vi.fn();

        render(
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                emptyText="No players"
                onRowClick={onRowClick}
            />,
        );

        await userEvent.click(screen.getByText("Ivaxa"));

        expect(onRowClick).toHaveBeenLastCalledWith(rows[1]);

        const first = within(screen.getByText("mrekk").closest("tr")!);
        expect(first.getByText("mrekk")).toBeInTheDocument();

        screen.getByText("mrekk").closest("tr")!.focus();
        await userEvent.keyboard("{Enter}");

        expect(onRowClick).toHaveBeenLastCalledWith(rows[0]);
    });

    it("marks pinned columns", () => {
        render(
            <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                emptyText="No players"
                pinnedColumnIds={["name"]}
            />,
        );

        expect(screen.getByRole("columnheader", { name: "Player" })).toHaveAttribute(
            "data-pinned",
            "true",
        );
        expect(screen.getByRole("columnheader", { name: "pp" })).not.toHaveAttribute("data-pinned");
    });
});
