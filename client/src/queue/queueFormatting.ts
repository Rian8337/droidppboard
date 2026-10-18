import type { PPVariant, RecalcAllowance, RecalcEntryView } from "app-structures";
import { ApiError, formatError } from "../api/http";
import { getVariantTitle } from "../variant/getVariantTitle";

/**
 * Formats the estimated wait of a newly queued player.
 *
 * @param seconds The estimate, which may be fractional, or `null` if it is unknown.
 */
export function formatEstimatedWait(seconds: number | null): string {
    if (seconds === null || !Number.isFinite(seconds)) {
        return "unknown";
    }

    const minutes = Math.round(seconds / 60);

    if (seconds < 60 || minutes < 1) {
        return "under a minute";
    }

    if (minutes < 120) {
        return `~${minutes} min`;
    }

    return `~${Math.round(minutes / 60)} h`;
}

/**
 * Formats a cooldown as `m:ss`.
 *
 * @param seconds The seconds left, which may be fractional.
 */
export function formatCooldown(seconds: number): string {
    const whole = Math.max(0, Math.ceil(seconds));

    return `${Math.floor(whole / 60)}:${(whole % 60).toString().padStart(2, "0")}`;
}

/**
 * Formats how long ago something happened.
 *
 * @param time The time, in milliseconds since the epoch.
 * @param now The current time, in milliseconds since the epoch.
 */
export function formatAge(time: number, now: number): string {
    const seconds = Math.max(0, Math.round((now - time) / 1000));

    if (seconds < 60) {
        return "just now";
    }

    const minutes = Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes} min ago`;
    }

    const hours = Math.floor(minutes / 60);

    return hours < 24 ? `${hours} h ago` : `${Math.floor(hours / 24)} d ago`;
}

/** Says how many more players the person may queue. */
export function formatSlots({ active, maxActive }: RecalcAllowance): string {
    const slots = Math.max(0, maxActive - active);

    return `You can queue ${slots} more ${slots === 1 ? "player" : "players"}`;
}

/** Counts the entries that are being calculated and those that are waiting. */
export function getEntryCounts(entries: readonly RecalcEntryView[]): {
    running: number;
    waiting: number;
} {
    return {
        running: entries.filter((entry) => entry.status === "calculating").length,
        waiting: entries.filter((entry) => entry.status === "waiting").length,
    };
}

/** The name to show for a variant: its title if it has one, else its name. */
export function getVariantLabel(variants: readonly PPVariant[], name: string): string {
    const variant = variants.find((candidate) => candidate.name === name);

    return variant ? getVariantTitle(variant) : name;
}

/**
 * The text to show for a failed attempt to queue a player. It is {@link formatError}'s, except for
 * the cooldown (a 429): the server's message already says how long to wait, so appending the
 * `Retry-After` wait would say it twice.
 */
export function formatQueueError(error: Error): string {
    return error instanceof ApiError && error.status === 429 ? error.message : formatError(error);
}
