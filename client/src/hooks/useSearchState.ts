import { useEffect, useState } from "react";

/** How long typing must pause before the search is sent. */
const searchDelayMs = 300;

export interface SearchState {
    /** What is typed in the search box right now. */
    readonly input: string;
    readonly setInput: (input: string) => void;

    /** What was searched for: the input once typing paused, trimmed. */
    readonly search: string;

    /** The page of the results, counted from 1. A different search starts again from the first. */
    readonly page: number;
    readonly setPage: (page: number) => void;
}

/** The state of a searchable, paged list whose search is sent only after typing pauses. */
export function useSearchState(): SearchState {
    const [input, setInput] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    useEffect(() => {
        const timeout = setTimeout(() => {
            const trimmed = input.trim();

            // Only a different search starts over; the first run on mount must keep the page.
            if (trimmed !== search) {
                setSearch(trimmed);
                setPage(1);
            }
        }, searchDelayMs);

        return () => clearTimeout(timeout);
    }, [input, search]);

    return { input, setInput, search, page, setPage };
}
