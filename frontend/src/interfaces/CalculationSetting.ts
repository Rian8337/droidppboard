import { ICalculationParams, ICalculationResult } from "app-structures";
import { ErrorSetting } from "./ErrorSetting";

export interface CalculationSetting extends ErrorSetting {
    readonly params?: ICalculationParams;
    readonly result?: ICalculationResult;
    setParams: (params?: ICalculationParams) => void;
    setResult: (result?: ICalculationResult) => void;
}