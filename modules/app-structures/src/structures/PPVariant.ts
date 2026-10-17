/**
 * A performance point variant served by the broker.
 */
export interface PPVariant {
    /**
     * The name of the variant, which is used to refer to it.
     */
    name: string;

    /**
     * The display title of the variant, if any.
     */
    title: string | null;

    /**
     * Other names that refer to the variant.
     */
    aliases: string[];

    /**
     * The description of the variant, if any.
     */
    description: string | null;

    /**
     * Whether the variant can currently serve requests.
     */
    available: boolean;

    /**
     * The game mode the variant calculates for, if known.
     */
    mode: "droid" | "osu" | null;

    /**
     * The algorithm the variant uses, if known.
     */
    algorithm: "live" | "rebalance" | null;
}
