import { MapWhitelist } from "app-database";
import { Context, createContext, FC, useState } from "react";
import { WhitelistSetting } from "../interfaces/WhitelistSetting";

const WhitelistNavigator: Context<WhitelistSetting> =
    createContext<WhitelistSetting>({
        data: [],
        page: 1,
        query: "",
        isSearchReady: false,
        enablePaging: false,
        setData: () => {},
        setPage: () => {},
        setQuery: () => {},
        setSearchReady: () => {},
        setEnablePaging: () => {},
        setErrorMessage: () => {},
    });

export const WhitelistNavigatorProvider: FC = (props) => {
    const [data, setData] = useState<MapWhitelist[]>([]);
    const [page, setPage] = useState<number>(1);
    const [query, setQuery] = useState<string>("");
    const [isSearchReady, setSearchReady] = useState<boolean>(false);
    const [enablePaging, setEnablePaging] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(
        undefined
    );

    const modifyData = (data: MapWhitelist[] = []) => {
        setData(data);
    };

    const modifyPage = (page: number = 1) => {
        setPage(page);
    };

    const modifyQuery = (query: string = "") => {
        if (query) {
            setPage(1);
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
        <WhitelistNavigator.Provider
            value={{
                data,
                page,
                query,
                isSearchReady,
                enablePaging,
                errorMessage,
                setData: modifyData,
                setPage: modifyPage,
                setQuery: modifyQuery,
                setSearchReady: modifySearchReady,
                setEnablePaging: modifyEnablePaging,
                setErrorMessage: modifyErrorMessage,
            }}
        >
            {props.children}
        </WhitelistNavigator.Provider>
    );
};

export default WhitelistNavigator;
