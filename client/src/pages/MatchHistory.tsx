import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const TeamMode = [
    "Head to Head",
    "Team VS"
]

const WinCondition = [
    "Score",
    "Accuracy",
    "Combo",
    "Score V2"
]

// function to format a string to a number with commas
function formatNumber(num: number) {
    return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
}

// convert modstring to mod array
// r = HR
// h = HD
// e = EZ
// d = DT
// n = NC
// t = HT
// f = FL
// v = V2
// s = PR
// m = SC
// l = RE
// f = PF
// u = SD
// i = FL
// speed multiplier and force ar splitted by | , speed multiplier start with x and force ar start with ar
// example: rd|x1.1ar10.3 -> HRDT, x1.1, AR10.3
function convertModString(modstring: string) {
    let mods: string[] = []
    let speedMultiplier = 1
    let forceAR = 0

    for (let i = 0; i < modstring.length; i++) {
        switch (modstring[i]) {
            case "r":
                mods.push("HR")
                break
            case "h":
                mods.push("HD")
                break
            case "e":
                mods.push("EZ")
                break
            case "d":
                mods.push("DT")
                break
            case "n":
                mods.push("NC")
                break
            case "t":
                mods.push("HT")
                break
            case "f":
                mods.push("FL")
                break
            case "v":
                mods.push("V2")
                break
            case "s":
                mods.push("PR")
                break
            case "m":
                mods.push("SC")
                break
            case "l":
                mods.push("RE")
                break
            case "f":
                mods.push("PF")
                break
            case "u":
                mods.push("SD")
                break
            case "i":
                mods.push("FL")
                break
            case "x":
                speedMultiplier = parseFloat(modstring.substring(i + 1, modstring.indexOf("ar") !== -1 ? modstring.indexOf("ar") : modstring.length))
                i += speedMultiplier.toString().length
                break
            case "a":
                forceAR = parseFloat(modstring.substring(i + 2, modstring.length))
                i += forceAR.toString().length
                break
            default:
                break
        }
    }

    // return the string
    return mods.join("") + ((speedMultiplier !== 1) ? ` x${speedMultiplier}` : "") + ((forceAR !== 0) ? ` AR${forceAR}` : "")
}


export default function MatchHistory() {
    const { matchid } = useParams<{ matchid: string }>()
    const [matchHistory, setMatchHistory] = useState<any>([])
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string>("")

    const loadHistory = useCallback(() => {
        setLoading(true)
        fetch(`https://droidpp.osudroid.moe/api/tournament/getrooms_history?id=${matchid}`)
            .then(res => res.json())
            .then(data => {
                // reorganized the score order if team mode is team vs (first blue team, then blue team members, then red team, then red team members)
                for (let i = 0; i < data.length; i++) {
                    if (data[i].team_mode === 1) {
                        let blueTeam: any[] = []
                        let redTeam: any[] = []

                        for (let j = 0; j < data[i].scores.length; j++) {
                            if (data[i].scores[j].user_id === "0") {
                                redTeam.push(data[i].scores[j])
                            }
                            else if (data[i].scores[j].user_id === "1") {
                                blueTeam.push(data[i].scores[j])
                            }
                            else if (data[i].scores[j].team === 0) {
                                redTeam.push(data[i].scores[j])
                            } 
                            else {
                                blueTeam.push(data[i].scores[j])
                            }
                        }

                        data[i].scores = redTeam.concat(blueTeam)
                    }
                }

                setMatchHistory(data)
                setLoading(false)
            })
            .catch(err => {
                setError(err.message)
                setLoading(false)
            })
    }, [matchid])


    useEffect(() => {
        if (!matchid) {
            setError("No room id specified")
            return
        }

        loadHistory()
    }, [])

    const renderScores = (scores: any) => {
        return (
            scores.map((score: any) => {
                return (
                    <tr key={score.session_id + score.user_name} style={{color: (score.user_id == "0") ? "#ffaaaa" : (score.user_id == "1") ? "#aaaaff" : "#ffffff"}}>
                        <td style={{width: "30%", fontWeight: (score.user_id <= 1 ? "bold" : "normal")}}>{score.user_name} {(score.is_alive) ? "" : "(FAILED)"}</td>
                        <td style={{width: "10%"}}>{convertModString(score.play_mod)}</td>
                        <td style={{width: "30%", fontWeight: (score.user_id <= 1 ? "bold" : "normal")}}>{formatNumber(score.score)}</td>
                        <td style={{width: "40%"}}>{(score.accuracy * 100).toFixed(2)}% ({score.hit300} / {score.hit100} / {score.hit50} / {score.hit0})</td>
                        <td style={{width: "20%"}}>{score.max_combo}x</td>
                    </tr>
                )
            })
        )
    }

    const renderHistory =
        matchHistory.map((session: any, i: number) => {
            return (
                <div key={session.id}>
                    <h3>{i+1}. {session.map_name}</h3>
                    <p>{TeamMode[session.team_mode] || "Unknown"} - Win Condition: {WinCondition[session.win_condition] || "Unknown"}</p>
                    <p>Played at: {(new Date(session.start_time)).toString()}</p>
                    <hr></hr>
                    <table style={{width: "100%"}}>
                        {/* <tr>
                            <th>Player</th>
                            <th>Mods</th>
                            <th>Score</th>
                            <th>Accuracy</th>
                            <th>Max Combo</th>
                        </tr> */}
                        {renderScores(session.scores)}
                    </table>
                    <hr></hr>
                </div>
            )
        })
    
    return (
        <div style={{width: "70%", marginLeft: "auto", marginRight: "auto"}}>
            <h1>Match History (Room Id: {matchid})</h1>

            {loading && <p>Loading...</p>}
            {error && <p>{error}</p>}
            <div>
                {matchHistory && renderHistory}
            </div>
        </div>
    );
}