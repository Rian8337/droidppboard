import { faArrowLeft, faPlus, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { PrototypePlayer } from "app-structures";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "../components/Button";
import { CountryFlag } from "../components/CountryFlag";
import { getDifference, variantWithoutMaster } from "../leaderboard/difference";
import { DifferenceText } from "../leaderboard/DifferenceText";
import { getVariantPath } from "../routing/paths";
import { formatPp } from "../utils/formatPp";
import { getProfileStats } from "./profileStats";
import styles from "./ProfileHeader.module.css";

export interface ProfileHeaderProps {
    profile: PrototypePlayer;
    variant: string;

    /** Whether the player was calculated before the variant was last updated. */
    isOutdated?: boolean;

    /** Whether somebody is logged in, who may queue the player. */
    canQueue: boolean;

    /** Queues the player for the variant. Add to queue stays disabled until this is given. */
    onAddToQueue?: () => void;

    /** Whether the player is being queued right now. */
    isQueuing?: boolean;

    /** What became of the last attempt to queue the player, shown beside the button. */
    queueFeedback?: { tone: "success" | "error"; text: string };
}

interface StatBlockProps {
    name: string;
    children: ReactNode;
}

function StatBlock({ name, children }: StatBlockProps) {
    return (
        <div className={styles.stat}>
            <dt>{name}</dt>
            <dd>{children}</dd>
        </div>
    );
}

/** The top of a profile: avatar and name, the actions, and the player's totals. */
export function ProfileHeader({
    profile,
    variant,
    isOutdated = false,
    canQueue,
    onAddToQueue,
    isQueuing = false,
    queueFeedback,
}: ProfileHeaderProps) {
    const stats = getProfileStats(profile);
    const hasMaster = variant !== variantWithoutMaster && profile.masterPPTotal !== undefined;

    return (
        <header className={styles.header}>
            <div className={styles.identity}>
                <img
                    className={styles.avatar}
                    src={`https://osudroid.moe/user/avatar?id=${profile.uid}`}
                    alt={profile.username}
                    width={64}
                    height={64}
                />
                <div className={styles.nameLine}>
                    <CountryFlag code={profile.country} />
                    <h2 className={styles.name}>{profile.username}</h2>
                </div>
                <div className={styles.actions}>
                    <Link to={getVariantPath(variant)} className={styles.back}>
                        <FontAwesomeIcon icon={faArrowLeft} /> Back
                    </Link>
                    {canQueue && (
                        <Button disabled={!onAddToQueue || isQueuing} onClick={onAddToQueue}>
                            <FontAwesomeIcon icon={faPlus} /> Add to queue
                        </Button>
                    )}
                </div>
                {queueFeedback && (
                    <p
                        role={queueFeedback.tone === "error" ? "alert" : "status"}
                        className={
                            queueFeedback.tone === "error" ? styles.queueError : styles.queued
                        }
                    >
                        {queueFeedback.text}
                    </p>
                )}
            </div>
            {isOutdated && (
                <div role="note" className={styles.outdated}>
                    <p className={styles.outdatedTitle}>
                        <FontAwesomeIcon icon={faTriangleExclamation} /> Outdated data
                    </p>
                    <p className={styles.outdatedText}>
                        {canQueue
                            ? "This player was calculated before the rework was last updated. Add them to the queue to recalculate."
                            : "This player was calculated before the rework was last updated. Log in to add them to the queue."}
                    </p>
                </div>
            )}
            <dl className={styles.stats}>
                <StatBlock name="Local pp">
                    <b>{formatPp(profile.localPPTotal)}</b>
                </StatBlock>
                <StatBlock name="Live pp">{formatPp(profile.livePPTotal)}</StatBlock>
                <StatBlock name="Difference">
                    <DifferenceText difference={getDifference(profile)} />
                </StatBlock>
                {hasMaster && (
                    <StatBlock name="Master pp">{formatPp(profile.masterPPTotal ?? 0)}</StatBlock>
                )}
                <StatBlock name="Aim pp">{formatPp(stats.aim)}</StatBlock>
                <StatBlock name="Tap pp">{formatPp(stats.tap)}</StatBlock>
                <StatBlock name="Accuracy pp">{formatPp(stats.accuracy)}</StatBlock>
                <StatBlock name="Flashlight pp">{formatPp(stats.flashlight)}</StatBlock>
                <StatBlock name="Reading pp">{formatPp(stats.reading)}</StatBlock>
                <StatBlock name="Hit accuracy">{stats.hitAccuracy.toFixed(2)}%</StatBlock>
            </dl>
        </header>
    );
}
