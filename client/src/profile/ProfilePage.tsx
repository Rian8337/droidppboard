import { useParams } from "react-router";
import { useMe } from "../api/auth";
import { ApiError } from "../api/http";
import { useProfile } from "../api/profile";
import { ErrorMessage } from "../components/ErrorMessage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ScoreTable } from "../scores/ScoreTable";
import { useCurrentVariant } from "../variant/useCurrentVariant";
import { ProfileHeader } from "./ProfileHeader";
import styles from "./ProfilePage.module.css";

interface PlayerProfileProps {
    variant: string;
    uid: number;
}

function PlayerProfile({ variant, uid }: PlayerProfileProps) {
    const { data: profile, error, isPending, refetch } = useProfile(variant, uid);
    const { data: me = null } = useMe();

    if (error instanceof ApiError && error.status === 404) {
        return <NotFoundPage message="Player not found" />;
    }

    if (error) {
        return <ErrorMessage message={error.message} onRetry={() => void refetch()} />;
    }

    if (isPending) {
        return <p className={styles.note}>Loading...</p>;
    }

    return (
        <div>
            <ProfileHeader profile={profile} variant={variant} canQueue={me !== null} />
            <ScoreTable scores={profile.pp} storageKey="profile-columns" />
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
        return <ErrorMessage message={error.message} onRetry={refetch} />;
    }

    if (!variant) {
        return <NotFoundPage message="Variant not found" />;
    }

    if (Number.isNaN(uid)) {
        return <NotFoundPage message="Player not found" />;
    }

    // A key per player and variant starts the table's search and sort over.
    return <PlayerProfile key={`${variant.name}:${uid}`} variant={variant.name} uid={uid} />;
}
