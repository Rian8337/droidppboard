import type { PPVariant } from "app-structures";
import { useState } from "react";
import { useMe } from "../api/auth";
import { useRecalcQueue } from "../api/recalc";
import { ErrorMessage } from "../components/ErrorMessage";
import { SegmentedControl } from "../components/SegmentedControl";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { FullRunStrip } from "./FullRunStrip";
import { QueueAddBar } from "./QueueAddBar";
import { QueueList } from "./QueueList";
import styles from "./QueueTab.module.css";
import { RecentList } from "./RecentList";
import { formatError } from "../api/http";

export interface QueueTabProps {
    variant: PPVariant;
}

/** Which of the two lists a phone shows. */
type PhoneList = "queue" | "recent";

/** The recalculation queue of a variant: add a player, the full run's progress, and the lists. */
export function QueueTab({ variant }: QueueTabProps) {
    // A key per variant starts the toggle and the phone's choice over when the variant changes.
    return <Queue key={variant.name} variant={variant} />;
}

function Queue({ variant }: QueueTabProps) {
    const { data: me = null, isPending: isMePending } = useMe();
    const breakpoint = useBreakpoint();
    const [showAll, setShowAll] = useState(false);
    const [phoneList, setPhoneList] = useState<PhoneList>("queue");
    // Only the view that is listed is polled every few seconds; the variant's own still backs the
    // allowance, the full-run strip and the recent list while everyone's is listed.
    const own = useRecalcQueue(variant.name, { isBackground: showAll });
    const everyone = useRecalcQueue(null, { isEnabled: showAll });
    const view = own.data;

    if (!view) {
        return own.error ? (
            <div className={styles.state}>
                <ErrorMessage message={formatError(own.error)} onRetry={() => void own.refetch()} />
            </div>
        ) : (
            <p className={styles.note}>Loading...</p>
        );
    }

    const listed = showAll ? everyone : own;
    const run = view.fullRuns.find(
        (candidate) =>
            candidate.variant === variant.name &&
            (candidate.status === "running" || candidate.status === "paused"),
    );
    const queueCount = (listed.data?.queue ?? []).filter(
        (entry) => entry.status === "calculating" || entry.status === "waiting",
    ).length;
    // Ages count to the moment the data was loaded, which the polling keeps close to now.
    const now = own.dataUpdatedAt;
    const listedNow = listed.dataUpdatedAt || now;

    const queueList = (
        <QueueList
            view={listed.data}
            error={listed.error}
            onRetry={() => void listed.refetch()}
            showAll={showAll}
            onShowAllChange={setShowAll}
            estimatedWaitSeconds={view.estimatedWaitSeconds}
            me={me}
            now={listedNow}
        />
    );
    const recentList = <RecentList view={view} now={now} />;

    return (
        <div className={styles.tab}>
            {!isMePending && (
                <QueueAddBar
                    variant={variant.name}
                    me={me}
                    allowance={view.allowance}
                    loadedAt={own.dataUpdatedAt}
                />
            )}
            {run && <FullRunStrip run={run} canStop={view.canManageFullRuns} now={now} />}
            {breakpoint === "phone" ? (
                <>
                    <div className={styles.switch}>
                        <SegmentedControl
                            label="List to show"
                            value={phoneList}
                            onChange={setPhoneList}
                            options={[
                                { value: "queue", label: `Queue (${queueCount})` },
                                { value: "recent", label: "Recently finished" },
                            ]}
                        />
                    </div>
                    {phoneList === "queue" ? queueList : recentList}
                </>
            ) : (
                <>
                    {queueList}
                    {recentList}
                </>
            )}
        </div>
    );
}
