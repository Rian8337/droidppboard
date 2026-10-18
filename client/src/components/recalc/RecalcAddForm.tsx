import { PPVariant, RecalcAllowance } from "app-structures";
import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    formatCooldown,
    getRecalcErrorMessage,
    recalcRequest,
} from "../../utils/recalcApi";

/**
 * Parses what a person typed as a player: all digits is a uid, anything else a username.
 */
function toPlayer(input: string): { uid: number } | { username: string } {
    const uid = Number(input);

    return /^\d+$/.test(input) && Number.isSafeInteger(uid)
        ? { uid }
        : { username: input };
}

/**
 * Counts down the seconds until a person may add again.
 *
 * @param allowance The latest allowance of the person. A new object restarts the countdown.
 * @returns The seconds left, which is 0 when they may add now.
 */
function useCooldownRemaining(allowance: RecalcAllowance | null): number {
    const [endsAt, setEndsAt] = useState(0);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const time = Date.now();

        setNow(time);
        setEndsAt(time + (allowance?.cooldownRemainingSeconds ?? 0) * 1000);
    }, [allowance]);

    const isCoolingDown = endsAt > now;

    useEffect(() => {
        if (!isCoolingDown) {
            return;
        }

        const timer = setInterval(() => setNow(Date.now()), 1000);

        return () => clearInterval(timer);
    }, [isCoolingDown]);

    return Math.max(0, (endsAt - now) / 1000);
}

export default function RecalcAddForm(props: {
    /**
     * The variants the viewer can see.
     */
    variants: readonly PPVariant[];

    /**
     * The name of the selected variant, or `null` if there is none yet.
     */
    variant: string | null;

    onVariantChange(variant: string): void;

    /**
     * The viewer's uid and username, or `null` for a visitor.
     */
    user: { uid: number; username: string } | null;

    /**
     * The viewer's allowance, or `null` if it is not known (yet) or for a visitor.
     */
    allowance: RecalcAllowance | null;

    /**
     * Called after a player was queued.
     */
    onQueued(): void;
}) {
    const location = useLocation();
    const [player, setPlayer] = useState("");
    const [isBusy, setBusy] = useState(false);
    const [error, setError] = useState<string | undefined>();
    const [notice, setNotice] = useState<string | undefined>();
    const cooldown = useCooldownRemaining(props.allowance);

    if (!props.user) {
        return (
            <section className="recalc-panel">
                <h3>Add to queue</h3>
                <p>
                    <Link to="/login" state={{ from: location.pathname }}>
                        Log in
                    </Link>{" "}
                    to add players to the queue.
                </p>
            </section>
        );
    }

    const trimmed = player.trim();
    const canSubmit = !isBusy && !!props.variant && trimmed.length > 0;

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        setBusy(true);
        setError(undefined);
        setNotice(undefined);

        const result = await recalcRequest("POST", "/queue", {
            variant: props.variant,
            ...toPlayer(trimmed),
        });

        if (result.ok) {
            setNotice(`Added ${trimmed} to the queue.`);
            setPlayer("");
            props.onQueued();
        } else {
            setError(getRecalcErrorMessage(result));
        }

        setBusy(false);
    }

    return (
        <section className="recalc-panel">
            <h3>Add to queue</h3>
            <form className="recalc-form" onSubmit={submit}>
                <label>
                    Variant
                    <select
                        className="recalc-input"
                        value={props.variant ?? ""}
                        onChange={(e) => props.onVariantChange(e.target.value)}
                    >
                        {props.variants.map((variant) => (
                            <option key={variant.name} value={variant.name}>
                                {variant.title ?? variant.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Player (uid or username)
                    <span className="recalc-inline">
                        <input
                            className="recalc-input"
                            type="text"
                            value={player}
                            maxLength={20}
                            onChange={(e) => setPlayer(e.target.value)}
                        />
                        <button
                            type="button"
                            className="recalc-button"
                            onClick={() =>
                                setPlayer(props.user!.uid.toString())
                            }
                        >
                            Me
                        </button>
                    </span>
                </label>
                <button
                    type="submit"
                    className="recalc-button"
                    disabled={!canSubmit}
                >
                    {isBusy ? "Adding..." : "Add to queue"}
                </button>
            </form>

            {error ? (
                <p role="alert" className="recalc-error">
                    {error}
                </p>
            ) : null}
            {notice ? <p role="status">{notice}</p> : null}

            {props.allowance ? (
                <p className="recalc-hint">
                    You have {props.allowance.active} of{" "}
                    {props.allowance.maxActive} players waiting (all variants)
                    {" · "}
                    {cooldown > 0
                        ? `next add in ${formatCooldown(cooldown)}`
                        : "you can add now"}
                </p>
            ) : null}
        </section>
    );
}
