/**
 * The address if it is an absolute http or https one, so that it is safe to link or load; `undefined`
 * for anything else (such as `javascript:` or `data:` addresses, relative ones and garbage).
 */
export function getSafeHttpUrl(value: string): string | undefined {
    try {
        const url = new URL(value);

        return url.protocol === "http:" || url.protocol === "https:" ? url.href : undefined;
    } catch {
        return undefined;
    }
}
