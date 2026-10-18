import { ModUtil } from "@rian8337/osu-base";
import { useParams } from "react-router";
import { useMatchHistory } from "../api/matchHistory";
import { DataTable, type Column } from "../components/DataTable";
import { ErrorMessage } from "../components/ErrorMessage";
import {
    calculateMatchCosts,
    isTeamTotal,
    redTotalUserId,
    sortTeamScores,
} from "../matchHistory/matchCosts";
import {
    MultiplayerTeamMode,
    teamModeNames,
    winConditionNames,
    type MultiplayerScore,
    type MultiplayerSession,
} from "../matchHistory/types";
import pageStyles from "./Page.module.css";
import styles from "./MatchHistoryPage.module.css";

/** The class a score's cells get: a team's total is coloured by its team. */
function getScoreClass(score: MultiplayerScore): string | undefined {
    if (!isTeamTotal(score)) {
        return undefined;
    }

    return score.userId === redTotalUserId ? styles.red : styles.blue;
}

const scoreColumns: Column<MultiplayerScore>[] = [
    {
        id: "player",
        header: "Player",
        render: (score) => (
            <span className={getScoreClass(score)}>
                {`${score.userName}${score.isAlive ? "" : " (FAILED)"}`}
            </span>
        ),
    },
    {
        id: "mods",
        header: "Mods",
        render: (score) =>
            ModUtil.modsToOrderedString(ModUtil.deserializeMods(score.playMod)) || "NM",
    },
    {
        id: "score",
        header: "Score",
        align: "right",
        render: (score) => (
            <span className={getScoreClass(score)}>{score.score.toLocaleString("en-US")}</span>
        ),
    },
    {
        id: "accuracy",
        header: "Accuracy",
        align: "right",
        render: (score) =>
            `${(score.accuracy * 100).toFixed(2)}% (${score.hit300} / ${score.hit100} / ${score.hit50} / ${score.hit0})`,
    },
    { id: "combo", header: "Combo", align: "right", render: (score) => `${score.maxCombo}x` },
];

const costColumns: Column<[string, number]>[] = [
    { id: "player", header: "Player", render: ([player]) => player },
    { id: "cost", header: "Match cost", align: "right", render: ([, cost]) => cost.toFixed(2) },
];

function SessionView({ session, number }: { session: MultiplayerSession; number: number }) {
    const scores =
        session.teamMode === MultiplayerTeamMode.teamVS
            ? sortTeamScores(session.scores)
            : session.scores;

    return (
        <section className={styles.session} aria-label={`Session ${number}`}>
            <h3 className={styles.heading}>{`${number}. ${session.mapName}`}</h3>
            <p className={styles.details}>
                {`${teamModeNames[session.teamMode] ?? "Unknown"} - Win condition: ${
                    winConditionNames[session.winCondition] ?? "Unknown"
                } - Remove slider lock: ${session.removeSliderLock ? "Yes" : "No"}`}
            </p>
            <p className={styles.details}>
                {`Played at: ${new Date(session.startTime).toLocaleString()}`}
            </p>
            <DataTable
                columns={scoreColumns}
                rows={scores}
                rowKey={(score) => `${score.userId}:${score.userName}`}
                emptyText="No scores."
            />
        </section>
    );
}

/** The sessions of a multiplayer room, as tournaments use them to see how a match went. */
export function MatchHistoryPage() {
    const { matchid: matchId = "" } = useParams();
    const { data: history, error, isPending, refetch } = useMatchHistory(matchId);

    if (error) {
        return (
            <div className={pageStyles.page}>
                <ErrorMessage message={error.message} onRetry={() => void refetch()} />
            </div>
        );
    }

    if (isPending) {
        return <p className={`${pageStyles.page} ${pageStyles.note}`}>Loading...</p>;
    }

    const costs = calculateMatchCosts(history.sessions).filter(([, cost]) => cost !== 0);

    return (
        <div className={pageStyles.page}>
            <p className={pageStyles.note}>{`Match history of room ${matchId}`}</p>
            <h2 className={pageStyles.title}>{history.name}</h2>
            {costs.length > 0 && (
                <section className={styles.section} aria-label="Match cost">
                    <DataTable
                        columns={costColumns}
                        rows={costs}
                        rowKey={([player]) => player}
                        emptyText="No players."
                    />
                </section>
            )}
            {history.sessions.map((session, index) => (
                <SessionView key={session.id} session={session} number={index + 1} />
            ))}
        </div>
    );
}
