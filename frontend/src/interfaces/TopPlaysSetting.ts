import { ErrorSetting } from "./ErrorSetting";
import { SearchBarSetting } from "./SearchBarSetting";

export interface TopPlaysSetting<T> extends SearchBarSetting, ErrorSetting {
    readonly data: T[];
    setData: (data?: T[]) => void;
}