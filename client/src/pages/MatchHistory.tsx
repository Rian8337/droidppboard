import { ModUtil } from "@rian8337/osu-base";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Head from "../components/Head";
import { MultiplayerRoomHistory } from "../interfaces/MultiplayerRoomHistory";
import { MultiplayerScore } from "../interfaces/MultiplayerScore";
import { MultiplayerTeam } from "../interfaces/MultiplayerTeam";
import { MultiplayerTeamMode } from "../interfaces/MultiplayerTeamMode";

const teamModeConst = ["Head to Head", "Team VS"] as const;
const winConditionConst = ["Score", "Accuracy", "Combo", "Score V2"] as const;

// function to format a string to a number with commas
function formatNumber(num: number | string) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}

export default function MatchHistory() {
    const { matchid } = useParams<{ matchid: string }>();
    const [roomHistory, setRoomHistory] =
        useState<MultiplayerRoomHistory | null>(null);
    const [matchCosts, setMatchCosts] = useState<[string, number][]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const loadHistory = useCallback(() => {
        setLoading(true);
        fetch(
            `https://droidpp.osudroid.moe/api/tournament/getrooms_history?id=${matchid}`
        )
            .then((res) => {
                if (!res.ok) {
                    throw new Error(
                        "Unable to load the match history of this room."
                    );
                }

                return res.json();
            })
            .then((data: MultiplayerRoomHistory) => {
                setRoomHistory(data);

                if (data.sessions.length === 0) {
                    return;
                }

                const playerTotalSessions = new Map<string, number>();
                const playerScoreRatios = new Map<string, number>();

                for (const session of data.sessions) {
                    const sessionPlayerScores = session.scores.filter(
                        (score) => score.userId !== 0 && score.userId !== 1
                    );

                    if (sessionPlayerScores.length === 0) {
                        continue;
                    }

                    const sessionAverageScore =
                        sessionPlayerScores.reduce(
                            (acc, score) => acc + score.score,
                            0
                        ) / sessionPlayerScores.length;

                    if (sessionAverageScore > 0) {
                        // Calculate the average score of each player in the session
                        for (const score of sessionPlayerScores) {
                            if (playerTotalSessions.has(score.userName)) {
                                playerTotalSessions.set(
                                    score.userName,
                                    playerTotalSessions.get(score.userName)! + 1
                                );
                            } else {
                                playerTotalSessions.set(score.userName, 1);
                            }

                            if (playerScoreRatios.has(score.userName)) {
                                playerScoreRatios.set(
                                    score.userName,
                                    playerScoreRatios.get(score.userName)! +
                                        score.score / sessionAverageScore
                                );
                            } else {
                                playerScoreRatios.set(
                                    score.userName,
                                    score.score / sessionAverageScore
                                );
                            }
                        }
                    }

                    // Reorganize the score order if team mode is team vs (first blue team, then blue team members, then red team, then red team members)
                    if (session.teamMode !== MultiplayerTeamMode.teamVS) {
                        continue;
                    }

                    session.scores.sort((a, b) => {
                        const getPriority = (
                            score: MultiplayerScore
                        ): number => {
                            switch (score.userId) {
                                case 0:
                                    return 2;

                                case 1:
                                    return 0;

                                default:
                                    return score.team === MultiplayerTeam.blue
                                        ? 1
                                        : 3;
                            }
                        };

                        return getPriority(a) - getPriority(b);
                    });
                }

                const matchCosts: [string, number][] = [];

                for (const player of playerTotalSessions.keys()) {
                    const totalSessions = playerTotalSessions.get(player)!;
                    const scoreRatio = playerScoreRatios.get(player)!;

                    matchCosts.push([
                        player,
                        (2 / (totalSessions + 2)) * scoreRatio,
                    ]);
                }

                setMatchCosts(matchCosts.sort((a, b) => b[1] - a[1]));
            })
            .catch((err) => {
                setError(err.message);
                setRoomHistory(null);
                setMatchCosts([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [matchid]);

    useEffect(() => {
        if (!matchid) {
            setError("No room ID specified");
            setRoomHistory(null);
            setMatchCosts([]);
            return;
        }

        loadHistory();
        // The page will not load dynamic content.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const renderScores = (scores: MultiplayerScore[]) => {
        return (
            <tbody>
                {scores.map((score) => {
                    return (
                        <tr
                            key={score.userId + score.userName}
                            style={{
                                color:
                                    score.userId === 0
                                        ? "#ffaaaa"
                                        : score.userId === 1
                                        ? "#aaaaff"
                                        : "#ffffff",
                            }}
                        >
                            <td
                                style={{
                                    width: "30%",
                                    fontWeight:
                                        score.userId <= 1 ? "bold" : "normal",
                                }}
                            >
                                {score.userName}{" "}
                                {score.isAlive ? "" : "(FAILED)"}
                            </td>
                            <td style={{ width: "10%" }}>
                                {ModUtil.modsToOrderedString(
                                    ModUtil.deserializeMods(score.playMod)
                                )}
                            </td>
                            <td
                                style={{
                                    width: "30%",
                                    fontWeight:
                                        score.userId <= 1 ? "bold" : "normal",
                                }}
                            >
                                {formatNumber(score.score)}
                            </td>
                            <td style={{ width: "40%" }}>
                                {(score.accuracy * 100).toFixed(2)}% (
                                {score.hit300} / {score.hit100} / {score.hit50}{" "}
                                / {score.hit0})
                            </td>
                            <td style={{ width: "20%" }}>{score.maxCombo}x</td>
                        </tr>
                    );
                })}
            </tbody>
        );
    };

    const renderHistory = roomHistory?.sessions.map((session, i) => {
        return (
            <div key={session.id}>
                <h3>
                    {i + 1}. {session.mapName}
                </h3>
                <p>
                    {teamModeConst[session.teamMode] ?? "Unknown"} - Win
                    Condition:{" "}
                    {winConditionConst[session.winCondition] ?? "Unknown"} -
                    Remove Slider Lock:{" "}
                    {session.removeSliderLock ? "Yes" : "No"}
                </p>
                <p>Played at: {new Date(session.startTime).toString()}</p>
                <hr></hr>
                <table style={{ width: "100%" }}>
                    {renderScores(session.scores)}
                </table>
                <hr></hr>
            </div>
        );
    });

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
                width: "70%",
                marginLeft: "auto",
                marginRight: "auto",
            }}
        >
            <Head
                description={`Match history of room ${matchid}.`}
                title={`PP Board - Match History - ${matchid}`}
            />

            <h1>Match History (Room ID: {matchid})</h1>

            {loading && <p>Loading...</p>}
            {error && <p>{error}</p>}

            {roomHistory && <h2>{roomHistory.name}</h2>}

            {matchCosts.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>Player</th>
                            <th>Match Cost</th>
                        </tr>
                    </thead>

                    <tbody>
                        {matchCosts.map(([player, cost]) => {
                            if (cost === 0) {
                                return null;
                            }

                            return (
                                <tr key={player}>
                                    <td>{player}</td>
                                    <td>{cost.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            <hr />
            <div>{roomHistory !== null && renderHistory}</div>
        </motion.div>
    );
}
