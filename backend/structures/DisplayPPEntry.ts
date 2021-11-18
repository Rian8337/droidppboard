import { Mod } from "../modules/mods/Mod";
import { PPEntry } from "./PPEntry";

/**
 * Represents a PP entry that will be displayed in a user's profile.
 */
export interface DisplayPPEntry extends PPEntry {
    /**
     * Array of converted mods for display purposes.
     */
    displayMods: Mod[];
}