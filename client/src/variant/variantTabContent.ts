import type { PPVariant } from "app-structures";
import type { ComponentType } from "react";
import { LeaderboardTab } from "../leaderboard/LeaderboardTab";
import type { VariantTab } from "../routing/paths";
import { QueueTab } from "../queue/QueueTab";
import { TopPlaysTab } from "../topPlays/TopPlaysTab";
import { CalculatorTab } from "./CalculatorTab";
import { InfoTab } from "./InfoTab";

/**
 * What each tab of a variant shows. A tab without an entry shows an empty state, so the tabs
 * built later register themselves here.
 */
export const variantTabContent: Partial<Record<VariantTab, ComponentType<{ variant: PPVariant }>>> =
    {
        info: InfoTab,
        leaderboard: LeaderboardTab,
        "top-plays": TopPlaysTab,
        queue: QueueTab,
        calculator: CalculatorTab,
    };
