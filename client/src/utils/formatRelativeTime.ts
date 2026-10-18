const units: readonly { readonly unit: Intl.RelativeTimeFormatUnit; readonly seconds: number }[] = [
    { unit: "year", seconds: 365 * 24 * 60 * 60 },
    { unit: "month", seconds: 30 * 24 * 60 * 60 },
    { unit: "week", seconds: 7 * 24 * 60 * 60 },
    { unit: "day", seconds: 24 * 60 * 60 },
    { unit: "hour", seconds: 60 * 60 },
    { unit: "minute", seconds: 60 },
];

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "always" });

/**
 * Describes how long ago a time was, such as "6 days ago" or "2 weeks ago". Anything under a minute
 * ago, or in the future, is "just now".
 *
 * @param isoTime The time, as an ISO 8601 string.
 * @param now The current time, in milliseconds. Defaults to the actual current time.
 */
export function formatRelativeTime(isoTime: string, now: number = Date.now()): string {
    const elapsedSeconds = (now - Date.parse(isoTime)) / 1000;

    for (const { unit, seconds } of units) {
        if (elapsedSeconds >= seconds) {
            return formatter.format(-Math.floor(elapsedSeconds / seconds), unit);
        }
    }

    return "just now";
}
