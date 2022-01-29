import { Mod } from "@rian8337/osu-base";
import { TopPrototypePPEntry } from "./TopPrototypePPEntry";

/**
 * Represents a PP entry that will be displayed in a user's profile.
 */
export interface DisplayTopPrototypePPEntry extends TopPrototypePPEntry {
    /**
     * Array of converted mods for display purposes.
     */
    displayMods: Mod[];
}
