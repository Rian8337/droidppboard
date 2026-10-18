/**
 * Every query key in one place, so that a mutation can invalidate exactly what it changes.
 * Later tasks add their entries here.
 */
export const queryKeys = {
    me: () => ["me"] as const,
    variants: () => ["variants"] as const,
};
