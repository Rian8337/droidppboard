import { IOldPPProfile } from "app-structures";
import { createContext, FC, useState } from "react";
import { TableSetting } from "../interfaces/TableSetting";

const OldLeaderboardNavigator = createContext<TableSetting<IOldPPProfile>>({
    data: [],
    internalPage: 1,
    currentPage: 1,
    query: "",
    isSearchReady: false,
    enablePaging: false,
    setData: () => {},
    setInternalPage: () => {},
    setCurrentPage: () => {},
    setQuery: () => {},
    setSearchReady: () => {},
    setEnablePaging: () => {},
    setErrorMessage: () => {},
});

export const OldLeaderboardNavigatorProvider: FC = (
    props: { children?: JSX.Element } = {}
) => {
    const [data, setData] = useState<IOldPPProfile[]>([]);
    const [internalPage, setInternalPage] = useState<number>(1);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [query, setQuery] = useState<string>("");
    const [isSearchReady, setSearchReady] = useState<boolean>(false);
    const [enablePaging, setEnablePaging] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(
        undefined
    );

    const modifyData = (data: IOldPPProfile[] = []) => {
        setData(data);
    };

    const modifyInternalPage = (page: number = 1) => {
        setInternalPage(page);
    };

    const modifyCurrentPage = (currentPage: number = 1) => {
        setCurrentPage(currentPage);
    };

    const modifyQuery = (query: string = "") => {
        if (query) {
            setInternalPage(1);
        }
        setQuery(query);
    };

    const modifySearchReady = (state: boolean = false) => {
        setSearchReady(state);
    };

    const modifyEnablePaging = (enablePaging: boolean = false) => {
        setEnablePaging(enablePaging);
    };

    const modifyErrorMessage = (errorMessage: string = "") => {
        setErrorMessage(errorMessage);
    };

    return (
        <OldLeaderboardNavigator.Provider
            value={{
                data,
                internalPage,
                currentPage,
                query,
                isSearchReady,
                enablePaging,
                errorMessage,
                setData: modifyData,
                setInternalPage: modifyInternalPage,
                setCurrentPage: modifyCurrentPage,
                setQuery: modifyQuery,
                setSearchReady: modifySearchReady,
                setEnablePaging: modifyEnablePaging,
                setErrorMessage: modifyErrorMessage,
            }}
        >
            {props.children}
        </OldLeaderboardNavigator.Provider>
    );
};

export default OldLeaderboardNavigator;
