import { createContext, FC, useState } from "react";
import { ICalculationParams, ICalculationResult } from "app-structures";
import { CalculationSetting } from "../interfaces/CalculationSetting";

const PrototypeCalculationContext = createContext<CalculationSetting>({
    errorMessage: "",
    setErrorMessage: () => {},
    setParams: () => {},
    setResult: () => {},
});

export const PrototypeCalculationContextProvider: FC = (
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
