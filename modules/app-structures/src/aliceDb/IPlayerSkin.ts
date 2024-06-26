import { SkinPreview } from "../structures/SkinPreview";

/**
 * Represents an information about a Discord user's osu!/osu!droid skin.
 */
export interface IPlayerSkin {
    /**
     * The ID of the user.
     */
    discordid: string;

    /**
     * The name of the skin.
     */
    name: string;

    /**
     * The description of the skin.
     */
    description: string;

    /**
     * The URL to the skin.
     */
    url: string;

    /**
     * The previews of the skin.
     */
    previews?: SkinPreview;
}
