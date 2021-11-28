import { FormEvent } from "react";
import { SearchBarSetting } from "../interfaces/SearchBarSetting";
import "../styles/modules/components/SearchBar.module.css";

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
        <form onSubmit={onSubmit} style={{ textAlign: "center" }}>
            <input
                className="search"
                type="text"
                name="query"
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
    );
}
