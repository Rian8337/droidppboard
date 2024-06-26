import { useState, useEffect } from "react";
import { useParams } from "react-router";
import PlayList from "./PlayList";
import Head from "./Head";
import { motion } from "framer-motion";
import PrototypeDescription from "./PrototypeDescription";
import { IInGamePP, IPrototypePP, IUserBind } from "app-structures";
import { Util } from "../Util";
import "../styles/profile.css";
import { PPModes } from "../interfaces/PPModes";
import InGameDescription from "./InGameDescription";

export default function PlayerProfile(props: { mode: PPModes }) {
    const { uid } = useParams();
    const [data, setData] = useState<
        IUserBind | IPrototypePP | IInGamePP | null | undefined
    >(undefined);
    const [rank, setRank] = useState<number | null>(null);
    const [prevRank, setPrevRank] = useState<number | null>(null);
    const [weightedAccuracy, setWeightedAccuracy] = useState<number | null>(
        null
    );
    const [lastUpdate, setLastUpdate] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(
        undefined
    );

    useEffect(() => {
        if (isNaN(parseInt(uid || ""))) {
            return setData(null);
        }

        let subpath = "";

        switch (props.mode) {
            case PPModes.prototype:
                subpath = "prototype/";
                break;
            case PPModes.inGame:
                subpath = "ingame/";
                break;
        }

        fetch(`/api/ppboard/${subpath}getuserprofile?uid=${uid}`)
            .then((res) => {
                if (res.status === 429) {
                    throw new Error(
                        "You are being rate limited. Please try again later"
                    );
                }

                if (!res.ok) {
                    throw new Error();
                }

                return res.json();
            })
            .then((rawData) => {
                if (props.mode !== PPModes.live) {
                    setPrevRank(rawData.prevpprank);
                    setLastUpdate(rawData.lastUpdate);
                }
                setRank(rawData.pprank);
                setData(rawData);

                let accSum = 0;
                let weight = 0;

                for (let i = 0; i < rawData.pp.length; ++i) {
                    accSum += rawData.pp[i].accuracy * Math.pow(0.95, i);
                    weight += Math.pow(0.95, i);
                }

                setWeightedAccuracy(accSum / weight || 0);
            })
            .catch((e: Error) => {
                setData(null);
                setErrorMessage(e.message);
            });
    }, [props.mode, uid]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            {!data ? (
                <>
                    <Head
                        description={`A player's ${
                            props.mode === PPModes.inGame
                                ? "in-game"
                                : props.mode === PPModes.prototype
                                ? "prototype"
                                : ""
                        }profile in Elaina PP Project.`}
                        title={`PP Board - ${
                            props.mode === PPModes.inGame
                                ? "In-Game "
                                : props.mode === PPModes.prototype
                                ? "Prototype "
                                : ""
                        }Player Profile`}
                    />
                    <h2 className="subtitle">
                        {data === undefined
                            ? "Loading player data..."
                            : "Player not found!"}
                    </h2>
                    {errorMessage ? (
                        <h3 className="error-message">
                            Error: {errorMessage}.
                        </h3>
                    ) : null}
                </>
            ) : (
                <>
                    <Head
                        description={`${data.username}'s ${
                            props.mode === PPModes.inGame
                                ? "in-game "
                                : props.mode === PPModes.prototype
                                ? "prototype "
                                : ""
                        }profile in Elaina PP Project.`}
                        title={`PP Board - ${data.username}`}
                    />
                    <h2 className="subtitle">
                        Player Profile: {data.username}
                    </h2>
                    {props.mode === PPModes.inGame ? (
                        <>
                            <InGameDescription />
                            <hr />
                        </>
                    ) : props.mode === PPModes.prototype ? (
                        <>
                            <PrototypeDescription />
                            <hr />
                        </>
                    ) : null}
                    <table>
                        <tbody>
                            {Util.isInGame(data) || Util.isPrototype(data) ? (
                                <>
                                    <tr>
                                        <th>Live PP</th>
                                        <td>{data.prevpptotal.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <th>Local PP</th>
                                        <td>{data.pptotal.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <th>PP Diff</th>
                                        <td>
                                            {(
                                                data.pptotal - data.prevpptotal
                                            ).toFixed(2)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th>Live PP Rank</th>
                                        <td>#{prevRank}</td>
                                    </tr>
                                    <tr>
                                        <th>Local PP Rank</th>
                                        <td>#{rank}</td>
                                    </tr>
                                    <tr>
                                        <th>Rank Diff</th>
                                        <td>
                                            {(
                                                rank! - prevRank!
                                            ).toLocaleString()}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th>Accuracy</th>
                                        <td>
                                            {weightedAccuracy?.toFixed(2) || 0}%
                                        </td>
                                    </tr>
                                    <tr>
                                        <th>Last Update</th>
                                        <td>
                                            {new Date(
                                                lastUpdate!
                                            ).toUTCString()}
                                        </td>
                                    </tr>
                                </>
                            ) : (
                                <>
                                    <tr>
                                        <th>Total PP</th>
                                        <td>{data.pptotal.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <th>PP Rank</th>
                                        <td>#{rank}</td>
                                    </tr>
                                    <tr>
                                        <th>Play Count</th>
                                        <td>{data.playc}</td>
                                    </tr>
                                    <tr>
                                        <th>Accuracy</th>
                                        <td>
                                            {weightedAccuracy?.toFixed(2) || 0}%
                                        </td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                    <PlayList data={data.pp} />
                </>
            )}
        </motion.div>
    );
}
