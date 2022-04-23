import { FormEvent } from "react";
import { PagingSetting } from "../interfaces/PagingSetting";
import "../styles/main.css";
import "../styles/navigation.css";

export default function Paging<T extends PagingSetting>(props: { state: T }) {
    const checkPageValidity = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!props.state.enablePaging) {
            return;
        }

        const target: HTMLInputElement = (
            event.target as HTMLFormElement
        )[0] as HTMLInputElement;
        const newPage: number = parseInt(target.value);

        if (!isNaN(newPage)) {
            props.state.setInternalPage(Math.max(newPage, 1));
        }
    };

    return (
        <div className="nav-button">
            <form onSubmit={checkPageValidity}>
                <input
                    className="search"
                    name="page"
                    style={{ width: "40%" }}
                    placeholder="Go to page..."
                    disabled={!props.state.enablePaging}
                />
                <input
                    className="submit-search"
                    style={{ width: "20%" }}
                    type="submit"
                    value="Go"
                    disabled={!props.state.enablePaging}
                />
            </form>
            <button
                className="page-nav"
                disabled={!props.state.enablePaging}
                onClick={(event) => {
                    event.preventDefault();

                    if (!props.state.enablePaging) {
                        return;
                    }

                    props.state.setInternalPage(props.state.internalPage - 1);
                }}
            >
                &lt;&lt;&lt; Previous Page
            </button>
            <button className="page-count" disabled>
                Page {props.state.currentPage}
            </button>
            <button
                className="page-nav"
                disabled={!props.state.enablePaging}
                onClick={(event) => {
                    event.preventDefault();

                    if (!props.state.enablePaging) {
                        return;
                    }

                    props.state.setInternalPage(props.state.internalPage + 1);
                }}
            >
                Next Page &gt;&gt;&gt;
            </button>
        </div>
    );
}
