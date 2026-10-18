/** The variants of the Beatmap calculator tool. They always exist and are the only ones it offers. */
export const toolVariantNames = [
    "droid-live",
    "droid-rebalance",
    "osu-live",
    "osu-rebalance",
] as const;

export type ToolVariantName = (typeof toolVariantNames)[number];

export const defaultToolVariant: ToolVariantName = "droid-live";

export const toolVariantLabels: Readonly<Record<ToolVariantName, string>> = {
    "droid-live": "osu!droid live",
    "droid-rebalance": "osu!droid rebalance",
    "osu-live": "osu!standard live",
    "osu-rebalance": "osu!standard rebalance",
};

export function isToolVariantName(value: unknown): value is ToolVariantName {
    return (toolVariantNames as readonly unknown[]).includes(value);
}

/** Whether the variant calculates osu!droid scores, which are the only ones a person has. */
export function isDroidVariant(name: string): boolean {
    return !name.startsWith("osu-");
}
