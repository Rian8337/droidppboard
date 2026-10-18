import type { RecalcAllowance } from "app-structures";
import { useState, type SubmitEvent } from "react";
import { Link, useLocation } from "react-router";
import type { Me } from "../api/auth";
import { useQueuePlayer } from "../api/recalc";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { useNow } from "../hooks/useNow";
import styles from "./QueueAddBar.module.css";
import { formatCooldown, formatQueueError, formatSlots } from "./queueFormatting";

export interface QueueAddBarProps {
    /** The name of the variant to queue players for. */
    variant: string;

    /** The person who is logged in, or `null` for a visitor. */
    me: Me | null;

    /** What the person may still queue, as the queue last said. */
    allowance: RecalcAllowance | null;

    /** When the allowance was loaded, in milliseconds since the epoch: the cooldown counts from it. */
    loadedAt: number;
}

/** Queues a player by name or uid, or the person themselves, and says how many more they may queue. */
export function QueueAddBar({ variant, me, allowance, loadedAt }: QueueAddBarProps) {
    const location = useLocation();
    const now = useNow(1000);
    const [player, setPlayer] = useState("");
    const [queuedName, setQueuedName] = useState<string | null>(null);
    const queuing = useQueuePlayer();
    const trimmed = player.trim();
    const cooldown = Math.max(
        0,
        (allowance?.cooldownRemainingSeconds ?? 0) - Math.max(0, now - loadedAt) / 1000,
    );

    if (!me) {
        return (
            <p className={styles.login}>
                <Link to="/login" state={{ from: location.pathname + location.search }}>
                    Log in to queue players
                </Link>
            </p>
        );
    }

    /** Queues a player by uid or by what was typed, and names them once they are queued. */
    function queuePlayer(target: number | string, name: string, onQueued?: () => void) {
        if (queuing.isPending) {
            return;
        }

        setQueuedName(null);
        queuing.mutate(
            { variant, player: target },
            {
                onSuccess: () => {
                    setQueuedName(name);
                    onQueued?.();
                },
            },
        );
    }

    function queueTypedPlayer(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();

        if (trimmed !== "") {
            queuePlayer(trimmed, trimmed, () => setPlayer(""));
        }
    }

    return (
        <div className={styles.addBar}>
            <form className={styles.form} onSubmit={queueTypedPlayer}>
                <TextField
                    className={styles.player}
                    aria-label="Player name or ID"
                    placeholder="Player name or ID"
                    maxLength={20}
                    autoComplete="off"
                    value={player}
                    onChange={(event) => setPlayer(event.target.value)}
                />
                <Button type="submit" disabled={trimmed === "" || queuing.isPending}>
                    {queuing.isPending ? "Adding..." : "Add to queue"}
                </Button>
                <Button
                    variant="secondary"
                    disabled={queuing.isPending}
                    onClick={() => queuePlayer(me.uid, me.username)}
                >
                    Add me
                </Button>
                {allowance && (
                    <span className={styles.slots}>
                        {formatSlots(allowance)}
                        {cooldown > 0 && ` · next add in ${formatCooldown(cooldown)}`}
                    </span>
                )}
            </form>
            {queuing.error && (
                <p role="alert" className={styles.error}>
                    {formatQueueError(queuing.error)}
                </p>
            )}
            {queuedName !== null && !queuing.error && (
                <p role="status" className={styles.notice}>
                    Added {queuedName} to the queue.
                </p>
            )}
        </div>
    );
}
