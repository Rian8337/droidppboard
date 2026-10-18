/**
 * Every query key in one place, so that a mutation can invalidate exactly what it changes.
 */
export const queryKeys = {
    me: () => ["me"] as const,
    variants: () => ["variants"] as const,
    leaderboard: (variant: string, page: number, search: string) =>
        ["leaderboard", variant, page, search] as const,
    profile: (variant: string, uid: number) => ["profile", variant, uid] as const,
    snapshot: (id: string) => ["snapshot", id] as const,
    /** Every queue view, whatever the variant: what a change to the queue invalidates. */
    recalcQueues: () => ["recalcQueue"] as const,
    /** The queue of a variant, or of every variant the person sees for `null`. */
    recalcQueue: (variant: string | null) => ["recalcQueue", variant] as const,
    /** The uids granted a variant. */
    manageGrants: (variant: string) => ["manage", "grants", variant] as const,
    /** Every API key, as the broker lists them. */
    manageKeys: () => ["manage", "keys"] as const,
    /** Every variant, as the admin list answers: private ones, `droid-live` and the osu! variants too. */
    manageVariants: () => ["manage", "variants"] as const,
    /** Every person who has a role or a grant. */
    manageUsers: () => ["manage", "users"] as const,
    /** The usernames of people, for the uids joined by commas. */
    manageUsernames: (uids: string) => ["manage", "usernames", uids] as const,
    /** Every roles lookup, whatever the uids: what a change to a role invalidates. */
    manageAllUserRoles: () => ["manage", "userRoles"] as const,
    /** The roles of people, for the uids joined by commas. */
    manageUserRoles: (uids: string) => ["manage", "userRoles", uids] as const,
    whitelist: (page: number, query: string) => ["whitelist", page, query] as const,
    scoreMultiplierSample: (beatmapId: string, mods: string) =>
        ["scoreMultiplierSample", beatmapId, mods] as const,
    skins: (page: number, query: string) => ["skins", page, query] as const,
    skin: (discordId: string, name: string) => ["skin", discordId, name] as const,
    matchHistory: (matchId: string) => ["matchHistory", matchId] as const,
    topPlays: (variant: string, mods: string) => ["topPlays", variant, mods] as const,
};
