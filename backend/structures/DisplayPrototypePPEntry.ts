import { Mod } from "../modules/mods/Mod";
import { PrototypePPEntry } from "./PrototypePPEntry";

/**
 * Represents a PP entry that will be displayed in a user's profile.
 */
export interface DisplayPrototypePPEntry extends PrototypePPEntry {
    /**
     * Array of converted mods for display purposes.
     */
    displayMods: Mod[];
}