import { IInGamePP, IPrototypePP, IUserBind } from "app-structures";
import { TableSetting } from "./TableSetting";

/**
 * Available leaderboard settings.
 */
export type LeaderboardSettings =
    | TableSetting<IUserBind>
    | TableSetting<IPrototypePP>
    | TableSetting<IInGamePP>;
