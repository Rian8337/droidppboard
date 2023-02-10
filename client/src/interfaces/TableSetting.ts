import { ErrorSetting } from "./ErrorSetting";
import { PagingSetting } from "./PagingSetting";
import { SearchBarSetting } from "./SearchBarSetting";

export interface TableSetting<T>
    extends PagingSetting,
        SearchBarSetting,
        ErrorSetting {
    readonly data: T[];
    setData: (data?: T[]) => void;
}
