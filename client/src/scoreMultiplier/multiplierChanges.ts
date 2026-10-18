export interface MultiplierChange {
    readonly mod: string;
    readonly previous: string;

    /** `null` when the change is one rule for the previous and the new multiplier alike. */
    readonly next: string | null;
}

/** How each mod's score multiplier changes in the rebalance. */
export const multiplierChanges: readonly MultiplierChange[] = [
    { mod: "EZ", previous: "0.5", next: "0.8" },
    { mod: "RE", previous: "0.5", next: "0.3" },
    { mod: "HR", previous: "1.06", next: "1.04" },
    { mod: "PR", previous: "1.06", next: "1.02 - 1.08 (OD-based)" },
    {
        mod: "HD",
        previous: "1.06 (default) / 1 (custom)",
        next: "1.06 / 1.03 (only fade approach circles)",
    },
    { mod: "TC", previous: "1.06", next: "1.02" },
    {
        mod: "FL",
        previous: "1.12 (default) / 1 (custom)",
        next: "1.02 - 1.2 (size-based, combo-based)",
    },
    { mod: "FL + FR", previous: "1", next: "FL bonus halved" },
    { mod: "DT / NC", previous: "1.12", next: "1.23" },
    { mod: "HT", previous: "0.3", next: "0.55" },
    { mod: "CS", previous: "0.09 (0.5x) - 1.24 (2x)", next: "0.2 (0.5x) - 1.46 (2x)" },
    { mod: "WU / WD", previous: "Rate formula updated (same as CS changes above)", next: null },
    { mod: "RD", previous: "1", next: "0.7" },
    { mod: "AD", previous: "1", next: "0.7" },
];
