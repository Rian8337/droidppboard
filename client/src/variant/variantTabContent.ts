import type { PPVariant } from "app-structures";
import type { ComponentType } from "react";
import { VariantAdminTab } from "../admin/VariantAdminTab";
import { LeaderboardTab } from "../leaderboard/LeaderboardTab";
import type { VariantTab } from "../routing/paths";
import { QueueTab } from "../queue/QueueTab";
import { TopPlaysTab } from "../topPlays/TopPlaysTab";
import { CalculatorTab } from "./CalculatorTab";
import { InfoTab } from "./InfoTab";

/** What each tab of a variant shows. */
export const variantTabContent: Readonly<
    Record<VariantTab, ComponentType<{ variant: PPVariant }>>
> = {
    info: InfoTab,
    leaderboard: LeaderboardTab,
    "top-plays": TopPlaysTab,
    queue: QueueTab,
    calculator: CalculatorTab,
    admin: VariantAdminTab,
};
