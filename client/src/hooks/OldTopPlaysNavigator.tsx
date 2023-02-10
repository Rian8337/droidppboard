import { OldPPEntry } from "app-structures";
import { createContext, FC, useState } from "react";
import { TopPlaysSetting } from "../interfaces/TopPlaysSetting";

const OldTopPlaysNavigator = createContext<TopPlaysSetting<OldPPEntry>>({
    data: [],
    query: "",
    isSearchReady: false,
    setData: () => {},
    setQuery: () => {},
    setSearchReady: () => {},
    setErrorMessage: () => {},
});

export const OldTopPlaysNavigatorProvider: FC = (
    props: { children?: JSX.Element } = {}
) => {
    const [data, setData] = useState<OldPPEntry[]>([]);
    const [query, setQuery] = useState<string>("");
    const [isSearchReady, setSearchReady] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(
        undefined
    );

    const modifyData = (data: OldPPEntry[] = []) => {
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
        <OldTopPlaysNavigator.Provider
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
        </OldTopPlaysNavigator.Provider>
    );
};

export default OldTopPlaysNavigator;
