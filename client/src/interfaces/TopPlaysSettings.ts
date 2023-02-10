import { OldPPEntry, PPEntry, PrototypePPEntry } from "app-structures";
import { TopPlaysSetting } from "./TopPlaysSetting";

/**
 * Available top plays settings.
 */
export type TopPlaysSettings =
    | TopPlaysSetting<OldPPEntry>
    | TopPlaysSetting<PPEntry>
    | TopPlaysSetting<PrototypePPEntry>;
