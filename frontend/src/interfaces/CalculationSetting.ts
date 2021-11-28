import { CalculationParams, CalculationResult } from "app-structures";
import { ErrorSetting } from "./ErrorSetting";

export interface CalculationSetting extends ErrorSetting {
    readonly params?: CalculationParams;
    readonly result?: CalculationResult;
    setParams: (params?: CalculationParams) => void;
    setResult: (result?: CalculationResult) => void;
}