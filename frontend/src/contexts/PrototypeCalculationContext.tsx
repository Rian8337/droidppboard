import { Context, createContext, FC, useState } from "react";
import {
    CalculationParams,
    CalculationResult,
} from "../../../modules/app-structures/src";
import { CalculationSetting } from "../interfaces/CalculationSetting";

const PrototypeCalculationContext: Context<CalculationSetting> =
    createContext<CalculationSetting>({
        errorMessage: "",
        setErrorMessage: () => {},
        setParams: () => {},
        setResult: () => {},
    });

export const PrototypeCalculationContextProvider: FC = (props) => {
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
        <PrototypeCalculationContext.Provider
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
        </PrototypeCalculationContext.Provider>
    );
};

export default PrototypeCalculationContext;
