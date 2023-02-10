import { IPrototypePP, IUserBind, IOldPPProfile } from "app-structures";
import { TableSetting } from "./TableSetting";

/**
 * Available leaderboard settings.
 */
export type LeaderboardSettings =
    | TableSetting<IUserBind>
    | TableSetting<IPrototypePP>
    | TableSetting<IOldPPProfile>;
