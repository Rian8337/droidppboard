export interface SearchBarSetting {
    readonly query: string;
    setQuery: (query?: string) => void;
    readonly isSearchReady: boolean;
    readonly setSearchReady: (state?: boolean) => void;
}