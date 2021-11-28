import { Context, createContext, FC, useState } from "react";
import {
    CalculationParams,
    CalculationResult,
} from "../../../modules/app-structures/src";
import { CalculationSetting } from "../interfaces/CalculationSetting";

const MainCalculationContext: Context<CalculationSetting> =
    createContext<CalculationSetting>({
        errorMessage: "",
        setErrorMessage: () => {},
        setParams: () => {},
        setResult: () => {},
    });

export const MainCalculationContextProvider: FC = (props) => {
    const [params, setParams] = useState<CalculationParams | undefined>(
        undefined
    );
    const [result, setResult] = useState<CalculationResult | undefined>(
        undefined
    );
    const [errorMessage, setErrorMessage] = useState<string | undefined>(
        undefined
    );

    const modifyParams = (params?: CalculationParams) => {
        setParams(params);
    };

    const modifyResult = (result?: CalculationResult) => {
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
