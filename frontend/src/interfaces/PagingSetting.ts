export interface PagingSetting {
    readonly page: number;
    readonly enablePaging: boolean;
    setPage: (page?: number) => void;
    setEnablePaging: (enablePaging?: boolean) => void;
}