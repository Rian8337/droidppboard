import { FormEvent } from "react";
import { SearchBarSetting } from "../interfaces/SearchBarSetting";
import "../styles/input.css";

export default function SearchBar<T extends SearchBarSetting>(props: {
    state: T;
    searchPlaceholder: string;
    submitPlaceholder: string;
}) {
    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!props.state.isSearchReady) {
            return;
        }

        const query: string = (
            (event.target as HTMLFormElement)[0] as HTMLInputElement
        ).value;

        props.state.setQuery(query);
    }

    return (
        <div className="search-container">
            <form onSubmit={onSubmit} style={{ textAlign: "center" }}>
                <input
                    className="search"
                    type="text"
                    name="query"
                    defaultValue={props.state.query}
                    placeholder={props.searchPlaceholder}
                    disabled={!props.state.isSearchReady}
                />
                <input
                    type="submit"
                    className="submit-search"
                    value={props.submitPlaceholder}
                    disabled={!props.state.isSearchReady}
                />
            </form>
        </div>
    );
}
