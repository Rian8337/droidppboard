import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MultiplayerScore } from "../interfaces/MultiplayerScore";
import { MultiplayerSession } from "../interfaces/MultiplayerSession";
import { MultiplayerTeamMode } from "../interfaces/MultiplayerTeamMode";
import { MultiplayerTeam } from "../interfaces/MultiplayerTeam";
import Head from "../components/Head";
import { motion } from "framer-motion";
import { ModUtil } from "@rian8337/osu-base";

/**
 * Represents a match session.
 */
interface MatchSessionHistory extends MultiplayerSession {
    /**
     * The scores set in this match session.
     */
    scores: MultiplayerScore[];
}

const TeamMode = ["Head to Head", "Team VS"] as const;

const WinCondition = ["Score", "Accuracy", "Combo", "Score V2"] as const;

// function to format a string to a number with commas
function formatNumber(num: number | string) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}

export default function MatchHistory() {
    const { matchid } = useParams<{ matchid: string }>();
    const [matchHistory, setMatchHistory] = useState<MatchSessionHistory[]>([]);
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
            .then((data: MatchSessionHistory[]) => {
                const playerTotalSessions = new Map<string, number>();
                const playerScoreRatios = new Map<string, number>();

                for (const session of data) {
                    const sessionPlayerScores = session.scores.filter(
                        (score) =>
                            score.user_id !== "0" && score.user_id !== "1"
                    );

                    if (sessionPlayerScores.length === 0) {
                        continue;
                    }

                    const sessionAverageScore =
                        sessionPlayerScores.reduce(
                            (acc, score) => acc + parseInt(score.score),
                            0
                        ) / sessionPlayerScores.length;

                    if (sessionAverageScore > 0) {
                        // Calculate the average score of each player in the session
                        for (const score of sessionPlayerScores) {
                            if (playerTotalSessions.has(score.user_name)) {
                                playerTotalSessions.set(
                                    score.user_name,
                                    playerTotalSessions.get(score.user_name)! +
                                        1
                                );
                            } else {
                                playerTotalSessions.set(score.user_name, 1);
                            }

                            if (playerScoreRatios.has(score.user_name)) {
                                playerScoreRatios.set(
                                    score.user_name,
                                    playerScoreRatios.get(score.user_name)! +
                                        parseInt(score.score) /
                                            sessionAverageScore
                                );
                            } else {
                                playerScoreRatios.set(
                                    score.user_name,
                                    parseInt(score.score) / sessionAverageScore
                                );
                            }
                        }
                    }

                    // Reorganize the score order if team mode is team vs (first blue team, then blue team members, then red team, then red team members)
                    if (session.team_mode !== MultiplayerTeamMode.teamVS) {
                        continue;
                    }

                    const blueTeam: MultiplayerScore[] = [];
                    const redTeam: MultiplayerScore[] = [];

                    for (const score of session.scores) {
                        switch (score.user_id) {
                            case "0":
                                redTeam.push(score);
                                break;

                            case "1":
                                blueTeam.push(score);
                                break;

                            default:
                                if (score.team === MultiplayerTeam.red) {
                                    redTeam.push(score);
                                } else {
                                    blueTeam.push(score);
                                }
                        }
                    }

                    session.scores = redTeam.concat(blueTeam);
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

                setMatchHistory(data);
                setMatchCosts(matchCosts.sort((a, b) => b[1] - a[1]));
            })
            .catch((err) => {
                setError(err.message);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [matchid]);

    useEffect(() => {
        if (!matchid) {
            setError("No room id specified");
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
                            key={score.session_id + score.user_name}
                            style={{
                                color:
                                    score.user_id === "0"
                                        ? "#ffaaaa"
                                        : score.user_id === "1"
                                        ? "#aaaaff"
                                        : "#ffffff",
                            }}
                        >
                            <td
                                style={{
                                    width: "30%",
                                    fontWeight:
                                        parseInt(score.user_id) <= 1
                                            ? "bold"
                                            : "normal",
                                }}
                            >
                                {score.user_name}{" "}
                                {score.is_alive ? "" : "(FAILED)"}
                            </td>
                            <td style={{ width: "10%" }}>
                                {ModUtil.modsToOrderedString(
                                    ModUtil.deserializeMods(score.play_mod)
                                )}
                            </td>
                            <td
                                style={{
                                    width: "30%",
                                    fontWeight:
                                        parseInt(score.user_id) <= 1
                                            ? "bold"
                                            : "normal",
                                }}
                            >
                                {formatNumber(score.score)}
                            </td>
                            <td style={{ width: "40%" }}>
                                {(parseFloat(score.accuracy) * 100).toFixed(2)}%
                                ({score.hit300} / {score.hit100} / {score.hit50}{" "}
                                / {score.hit0})
                            </td>
                            <td style={{ width: "20%" }}>{score.max_combo}x</td>
                        </tr>
                    );
                })}
            </tbody>
        );
    };

    const renderHistory = matchHistory.map((session, i) => {
        return (
            <div key={session.id}>
                <h3>
                    {i + 1}. {session.map_name}
                </h3>
                <p>
                    {TeamMode[session.team_mode] || "Unknown"} - Win Condition:{" "}
                    {WinCondition[session.win_condition] || "Unknown"} - Remove
                    Slider Lock: {session.remove_slider_lock ? "Yes" : "No"}
                </p>
                <p>Played at: {new Date(session.start_time).toString()}</p>
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
            <div>{matchHistory.length > 0 && renderHistory}</div>
        </motion.div>
    );
}
