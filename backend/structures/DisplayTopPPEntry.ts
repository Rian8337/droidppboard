import { Mod } from "@rian8337/osu-base";
import { TopPPEntry } from "./TopPPEntry";

/**
 * Represents a PP entry that will be displayed in a user's profile.
 */
export interface DisplayTopPPEntry extends TopPPEntry {
    /**
     * Array of converted mods for display purposes.
     */
    displayMods: Mod[];
}
