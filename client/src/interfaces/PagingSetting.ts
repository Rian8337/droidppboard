export interface PagingSetting {
    /**
     * This page state is used internally and will not be exposed to the user.
     */
    readonly internalPage: number;
    /**
     * This page state will be exposed to the user. Update
     * this when operations are done to update components.
     */
    readonly currentPage: number;
    readonly enablePaging: boolean;
    setInternalPage: (page?: number) => void;
    setCurrentPage: (currentPage?: number) => void;
    setEnablePaging: (enablePaging?: boolean) => void;
}
