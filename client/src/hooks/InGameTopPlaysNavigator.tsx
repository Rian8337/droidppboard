import { PPEntry } from "app-structures";
import { createContext, FC, useState } from "react";
import { TopPlaysSetting } from "../interfaces/TopPlaysSetting";

const InGameTopPlaysNavigator = createContext<TopPlaysSetting<PPEntry>>({
    data: [],
    query: "",
    isSearchReady: false,
    setData: () => {},
    setQuery: () => {},
    setSearchReady: () => {},
    setErrorMessage: () => {},
});

export const InGameTopPlaysNavigatorProvider: FC = (
    props: { children?: JSX.Element } = {}
) => {
    const [data, setData] = useState<PPEntry[]>([]);
    const [query, setQuery] = useState<string>("");
    const [isSearchReady, setSearchReady] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(
        undefined
    );

    const modifyData = (data: PPEntry[] = []) => {
        setData(data);
    };

    const modifyQuery = (query: string = "") => {
        setQuery(query);
    };

    const modifySearchReady = (state: boolean = false) => {
        setSearchReady(state);
    };

    const modifyErrorMessage = (errorMessage: string = "") => {
        setErrorMessage(errorMessage);
    };

    return (
        <InGameTopPlaysNavigator.Provider
            value={{
                data,
                query,
                isSearchReady,
                errorMessage,
                setData: modifyData,
                setQuery: modifyQuery,
                setSearchReady: modifySearchReady,
                setErrorMessage: modifyErrorMessage,
            }}
        >
            {props.children}
        </InGameTopPlaysNavigator.Provider>
    );
};

export default InGameTopPlaysNavigator;
