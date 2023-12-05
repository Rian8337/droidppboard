import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MultiplayerScore } from "../interfaces/MultiplayerScore";
import { MultiplayerSession } from "../interfaces/MultiplayerSession";
import { MultiplayerTeamMode } from "../interfaces/MultiplayerTeamMode";
import { MultiplayerTeam } from "../interfaces/MultiplayerTeam";

/**
 * Represents a match session.
 */
interface MatchSessionHistory extends MultiplayerSession {
    /**
     * The scores set in this match session.
     */
    scores: MultiplayerScore[];
}

const TeamMode = ["Head to Head", "Team VS"];

const WinCondition = ["Score", "Accuracy", "Combo", "Score V2"];

// function to format a string to a number with commas
function formatNumber(num: number) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}

// convert modstring to mod array
// r = HR
// h = HD
// e = EZ
// d = DT
// n = NC
// t = HT
// v = V2
// s = PR
// m = SC
// l = RE
// f = PF
// u = SD
// i = FL
// x = RX
// p = AP
// speed multiplier and force ar splitted by | , speed multiplier start with x and force ar start with ar
// example: rd|x1.1,AR10.3 -> HRDT, x1.1, AR10.3
function convertModString(modstring: string) {
    const [droidMods, customStatsString]: string[] = modstring.split("|");
    let finalStr = "";

    // convert mods
    for (const m of droidMods) {
        switch (m) {
            case "r":
                finalStr += "HR";
                break;
            case "h":
                finalStr += "HD";
                break;
            case "e":
                finalStr += "EZ";
                break;
            case "d":
                finalStr += "DT";
                break;
            case "n":
                finalStr += "NC";
                break;
            case "t":
                finalStr += "HT";
                break;
            case "v":
                finalStr += "V2";
                break;
            case "s":
                finalStr += "PR";
                break;
            case "m":
                finalStr += "SC";
                break;
            case "l":
                finalStr += "RE";
                break;
            case "f":
                finalStr += "PF";
                break;
            case "u":
                finalStr += "SD";
                break;
            case "i":
                finalStr += "FL";
                break;
            case "x":
                finalStr += "RX";
                break;
            case "p":
                finalStr += "AP";
                break;
        }
    }

    // process custom stats and speed multiplier
    const customStats: string[] = [];
    for (const s of customStatsString) {
        if (!s) {
            continue;
        }

        switch (true) {
            // Forced stats
            case s.startsWith("CS"):
            case s.startsWith("AR"):
            case s.startsWith("OD"):
            case s.startsWith("HP"):
            // FL follow delay
            // eslint-disable-next-line no-fallthrough
            case s.startsWith("FLD"):
                customStats.push(s);
                break;
            // Speed multiplier
            case s.startsWith("x"):
                customStats.push(`${s.replace("x", "")}x`);
                break;
        }
    }

    if (customStats.length > 0) {
        finalStr += ` (${customStats.join(", ")})`;
    }

    return finalStr;
}

export default function MatchHistory() {
    const { matchid } = useParams<{ matchid: string }>();
    const [matchHistory, setMatchHistory] = useState<MatchSessionHistory[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const loadHistory = useCallback(() => {
        setLoading(true);
        fetch(
            `https://droidpp.osudroid.moe/api/tournament/getrooms_history?id=${matchid}`
        )
            .then((res) => res.json())
            .then((data: MatchSessionHistory[]) => {
                // reorganized the score order if team mode is team vs (first blue team, then blue team members, then red team, then red team members)
                for (const session of data) {
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

                setMatchHistory(data);
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
        return scores.map((score) => {
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
                        {score.user_name} {score.is_alive ? "" : "(FAILED)"}
                    </td>
                    <td style={{ width: "10%" }}>
                        {convertModString(score.play_mod)}
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
                        {(score.accuracy * 100).toFixed(2)}% ({score.hit300} /{" "}
                        {score.hit100} / {score.hit50} / {score.hit0})
                    </td>
                    <td style={{ width: "20%" }}>{score.max_combo}x</td>
                </tr>
            );
        });
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
                    Slider Lock: {session.remove_slider_lock ? "Yes" : "No"} -
                    Allow more than three cursors:{" "}
                    {session.extra_three_cursors ? "Yes" : "No"}
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
        <div style={{ width: "70%", marginLeft: "auto", marginRight: "auto" }}>
            <h1>Match History (Room ID: {matchid})</h1>

            {loading && <p>Loading...</p>}
            {error && <p>{error}</p>}
            <div>{matchHistory && renderHistory}</div>
        </div>
    );
}
