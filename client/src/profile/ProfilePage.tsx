import { useNavigate, useParams } from "react-router";
import { useMe } from "../api/auth";
import { ApiError } from "../api/http";
import { useProfile } from "../api/profile";
import { useQueuePlayer } from "../api/recalc";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage } from "../components/ErrorMessage";
import { variantWithoutMaster } from "../leaderboard/difference";
import { isOutdated } from "../leaderboard/isOutdated";
import { NotFoundPage } from "../pages/NotFoundPage";
import { getQueuePath } from "../routing/paths";
import { ScoreTable } from "../scores/ScoreTable";
import { getVariantTitle } from "../variant/getVariantTitle";
import { useCurrentVariant } from "../variant/useCurrentVariant";
import { ProfileHeader, type ProfileHeaderProps } from "./ProfileHeader";
import styles from "./ProfilePage.module.css";
import { formatError } from "../api/http";
import { formatQueueError } from "../queue/queueFormatting";

interface PlayerProfileProps {
    variant: string;
    variantTitle: string;
    /** When the variant's calculator was built, which tells whether the profile is outdated. */
    variantBuiltAt: string | null;
    uid: number;
}

/** What to tell the person about their last attempt to queue the player, if there was one. */
function getQueueFeedback(
    queuing: ReturnType<typeof useQueuePlayer>,
    username: string,
): ProfileHeaderProps["queueFeedback"] {
    if (queuing.error) {
        return { tone: "error", text: formatQueueError(queuing.error) };
    }

    return queuing.isSuccess
        ? { tone: "success", text: `Added ${username} to the queue.` }
        : undefined;
}

function PlayerProfile({ variant, variantTitle, variantBuiltAt, uid }: PlayerProfileProps) {
    const { data: profile, error, isPending, refetch } = useProfile(variant, uid);
    const { data: me = null } = useMe();
    const queuing = useQueuePlayer();
    const navigate = useNavigate();

    if (error instanceof ApiError && error.status === 404) {
        // A player without a profile here has usually just not been calculated yet, which the queue fixes.
        // The uid may also belong to no account at all, which only the queue can tell.
        const message =
            me?.uid === uid
                ? `You have not been calculated in ${variantTitle} yet. Add yourself to the queue to get a profile.`
                : `This player has not been calculated in ${variantTitle} yet. Add them to the queue to get their profile.`;

        return (
            <EmptyState
                message={message}
                action={
                    <Button onClick={() => void navigate(getQueuePath(variant, uid))}>
                        Go to the queue
                    </Button>
                }
            />
        );
    }

    if (error) {
        return <ErrorMessage message={formatError(error)} onRetry={() => void refetch()} />;
    }

    if (isPending) {
        return <p className={styles.note}>Loading...</p>;
    }

    return (
        <div>
            <title>{`${profile.username} · ${variantTitle} · PP Board`}</title>
            <ProfileHeader
                profile={profile}
                variant={variant}
                isOutdated={isOutdated(profile, { builtAt: variantBuiltAt })}
                canQueue={me !== null}
                onAddToQueue={() => queuing.mutate({ variant, player: uid })}
                isQueuing={queuing.isPending}
                queueFeedback={getQueueFeedback(queuing, profile.username)}
            />
            <ScoreTable
                scores={profile.pp}
                showMaster={variant !== variantWithoutMaster}
                storageKey="profile-columns"
            />
        </div>
    );
}

/** A player's profile in a variant: their totals and every score. */
export function ProfilePage() {
    const { uid: uidParameter } = useParams();
    const { variant, isLoading, error, refetch } = useCurrentVariant();
    const uid = /^\d+$/.test(uidParameter ?? "") ? Number(uidParameter) : NaN;

    if (isLoading) {
        return <p className={styles.note}>Loading...</p>;
    }

    if (error) {
        return <ErrorMessage message={formatError(error)} onRetry={refetch} />;
    }

    if (!variant) {
        return <NotFoundPage message="Rework not found" />;
    }

    if (Number.isNaN(uid)) {
        return <NotFoundPage message="Player not found" />;
    }

    // A key per player and variant starts the table's search and sort over.
    return (
        <PlayerProfile
            key={`${variant.name}:${uid}`}
            variant={variant.name}
            variantTitle={getVariantTitle(variant)}
            variantBuiltAt={variant.builtAt}
            uid={uid}
        />
    );
}
