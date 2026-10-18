/**
 * Formats a time as an absolute date and time in UTC, such as "2026-10-11 13:16 UTC".
 *
 * @param isoTime The time, as an ISO 8601 string.
 */
export function formatUtcTime(isoTime: string): string {
    return `${new Date(isoTime).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
