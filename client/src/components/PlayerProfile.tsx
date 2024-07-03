import { useState, useEffect, useContext, useRef } from "react";
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
import PrototypeSelectorNavigator from "../hooks/PrototypeSelectorNavigator";
import PrototypeSelector from "./PrototypeSelector";

export default function PlayerProfile(props: { mode: PPModes }) {
    const prototypeSelectorCtx = useContext(PrototypeSelectorNavigator);
    const params = useParams();
    const { uid, type } = params;

    const typeRef = useRef(type);

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
        if (uid === undefined || isNaN(parseInt(uid || ""))) {
            return;
        }

        // Special case when the user loads this page with a type in the URL.
        if (
            props.mode === PPModes.prototype &&
            typeRef.current &&
            typeRef.current !== prototypeSelectorCtx.currentRework?.type
        ) {
            prototypeSelectorCtx.setCurrentReworkToUnknown(typeRef.current);

            // Invalidate the ref so that we don't keep setting the rework to unknown.
            typeRef.current = undefined;

            return;
        }

        setData(undefined);
        setErrorMessage(undefined);
        setRank(null);
        setPrevRank(null);
        setWeightedAccuracy(null);
        setLastUpdate(null);

        let subpath = "";

        switch (props.mode) {
            case PPModes.prototype:
                subpath = "prototype/";
                break;
            case PPModes.inGame:
                subpath = "ingame/";
                break;
        }

        const searchParams = new URLSearchParams();
        const controller = new AbortController();

        searchParams.set("uid", uid);

        if (
            props.mode === PPModes.prototype &&
            prototypeSelectorCtx.currentRework
        ) {
            searchParams.set("type", prototypeSelectorCtx.currentRework.type);
        }

        fetch(
            `/api/ppboard/${subpath}getuserprofile?${searchParams.toString()}`,
            { signal: controller.signal }
        )
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
                let playData =
                    props.mode === PPModes.prototype ? rawData.data : rawData;

                if (props.mode !== PPModes.live) {
                    setPrevRank(playData.prevpprank);
                    setLastUpdate(playData.lastUpdate);
                }
                setRank(playData.pprank);
                setData(playData);

                let accSum = 0;
                let weight = 0;

                for (let i = 0; i < playData.pp.length; ++i) {
                    accSum += playData.pp[i].accuracy * Math.pow(0.95, i);
                    weight += Math.pow(0.95, i);
                }

                setWeightedAccuracy(accSum / weight || 0);

                if (props.mode === PPModes.prototype) {
                    prototypeSelectorCtx.setReworks(rawData.reworks);

                    prototypeSelectorCtx.setCurrentRework(
                        rawData.currentRework
                    );
                }
            })
            .catch((e: Error) => {
                if (e.name === "AbortError") {
                    return;
                }

                setData(null);
                setErrorMessage(e.message);
            });

        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.mode, prototypeSelectorCtx.currentRework?.type, uid]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            {data ? (
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
            ) : (
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
            )}

            <h2 className="subtitle">
                {data === undefined
                    ? "Loading player data..."
                    : data === null
                    ? "Player not found!"
                    : `Player Profile: ${data.username}`}
            </h2>

            {props.mode === PPModes.inGame ? (
                <>
                    <InGameDescription />
                    <hr />
                </>
            ) : props.mode === PPModes.prototype ? (
                <>
                    <PrototypeDescription />
                    <br />
                    <PrototypeSelector />
                    <hr />
                </>
            ) : null}

            {errorMessage ? (
                <h3 className="error-message">Error: {errorMessage}.</h3>
            ) : null}

            {data && data.pp.length > 0 ? (
                <>
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
            ) : (
                <>
                    {data ? (
                        <h3 className="subtitle">
                            No scores found. Please check again later.
                        </h3>
                    ) : null}
                </>
            )}
        </motion.div>
    );
}
