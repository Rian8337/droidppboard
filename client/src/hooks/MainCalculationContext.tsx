import { Context, createContext, FC, useState } from "react";
import { ICalculationParams, ICalculationResult } from "app-structures";
import { CalculationSetting } from "../interfaces/CalculationSetting";

const MainCalculationContext: Context<CalculationSetting> =
    createContext<CalculationSetting>({
        errorMessage: "",
        setErrorMessage: () => {},
        setParams: () => {},
        setResult: () => {},
    });

export const MainCalculationContextProvider: FC = (
    props: { children?: JSX.Element } = {}
) => {
    const [params, setParams] = useState<ICalculationParams | undefined>(
        undefined
    );
    const [result, setResult] = useState<ICalculationResult | undefined>(
        undefined
    );
    const [errorMessage, setErrorMessage] = useState<string | undefined>(
        undefined
    );

    const modifyParams = (params?: ICalculationParams) => {
        setParams(params);
    };

    const modifyResult = (result?: ICalculationResult) => {
        setResult(result);
    };

    const modifyErrorMessage = (errorMessage?: string) => {
        setErrorMessage(errorMessage);
    };

    return (
        <MainCalculationContext.Provider
            value={{
                errorMessage,
                params,
                result,
                setParams: modifyParams,
                setResult: modifyResult,
                setErrorMessage: modifyErrorMessage,
            }}
        >
            {props.children}
        </MainCalculationContext.Provider>
    );
};

export default MainCalculationContext;
