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
     * The number of the variant's instances that are currently healthy.
     */
    healthyInstanceCount: number;

    /**
     * The game mode the variant calculates for, if known.
     */
    mode: "droid" | "osu" | null;

    /**
     * The algorithm the variant uses, if known.
     */
    algorithm: "live" | "rebalance" | null;

    /**
     * Whether everyone can see the variant, as opposed to only the people it is shared with.
     */
    public: boolean;

    /**
     * Whether an admin pinned the variant, which lists it ahead of the unpinned ones.
     */
    pinned: boolean;

    /**
     * When the variant's calculator was built, as an ISO 8601 timestamp, if known.
     */
    builtAt: string | null;

    /**
     * The version of the variant's calculator, if known.
     */
    calculatorVersion: string | null;
}
