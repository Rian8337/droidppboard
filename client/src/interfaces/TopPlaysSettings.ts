import { PPEntry, PrototypePPEntry } from "app-structures";
import { TopPlaysSetting } from "./TopPlaysSetting";

/**
 * Available top plays settings.
 */
export type TopPlaysSettings =
    | TopPlaysSetting<PPEntry>
    | TopPlaysSetting<PrototypePPEntry>;
