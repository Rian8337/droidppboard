import { PrototypePPEntry } from "app-structures";
import { Context, createContext, FC, useState } from "react";
import { TopPlaysSetting } from "../interfaces/TopPlaysSetting";

const PrototypeTopPlaysNavigator: Context<TopPlaysSetting<PrototypePPEntry>> =
    createContext<TopPlaysSetting<PrototypePPEntry>>({
        data: [],
        query: "",
        isSearchReady: false,
        setData: () => {},
        setQuery: () => {},
        setSearchReady: () => {},
        setErrorMessage: () => {},
    });

export const PrototypeTopPlaysNavigatorProvider: FC = (
    props: { children?: JSX.Element } = {}
) => {
    const [data, setData] = useState<PrototypePPEntry[]>([]);
    const [query, setQuery] = useState<string>("");
    const [isSearchReady, setSearchReady] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(
        undefined
    );

    const modifyData = (data: PrototypePPEntry[] = []) => {
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
        <PrototypeTopPlaysNavigator.Provider
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
        </PrototypeTopPlaysNavigator.Provider>
    );
};

export default PrototypeTopPlaysNavigator;
