/**
 * Every query key in one place, so that a mutation can invalidate exactly what it changes.
 * Later tasks add their entries here.
 */
export const queryKeys = {
    me: () => ["me"] as const,
    variants: () => ["variants"] as const,
    leaderboard: (variant: string, page: number, search: string) =>
        ["leaderboard", variant, page, search] as const,
    profile: (variant: string, uid: number) => ["profile", variant, uid] as const,
    topPlays: (variant: string, mods: string) => ["topPlays", variant, mods] as const,
};
