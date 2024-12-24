import { useState, useEffect, useContext, useRef } from "react";
import { useParams } from "react-router";
import PlayList from "./PlayList";
import Head from "./Head";
import { motion } from "framer-motion";
import PrototypeDisclaimer from "./PrototypeDisclaimer";
import { IPrototypePP } from "app-structures";
import "../styles/profile.css";
import PrototypeSelectorNavigator from "../hooks/PrototypeSelectorNavigator";
import PrototypeSelector from "./PrototypeSelector";
import PrototypeDescription from "./PrototypeDescription";

export default function PlayerProfile() {
    const prototypeSelectorCtx = useContext(PrototypeSelectorNavigator);
    const params = useParams();
    const { uid, type } = params;

    const typeRef = useRef(type);

    const [data, setData] = useState<IPrototypePP | null | undefined>();
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
            typeRef.current &&
            typeRef.current !== prototypeSelectorCtx.currentRework?.type
        ) {
            prototypeSelectorCtx.resetCurrentRework(typeRef.current);

            // Invalidate the ref so that we don't keep setting the rework to unknown.
            typeRef.current = undefined;

            return;
        }

        setData(undefined);
        setErrorMessage(undefined);
        setWeightedAccuracy(null);
        setLastUpdate(null);

        const searchParams = new URLSearchParams();
        const controller = new AbortController();

        searchParams.set("uid", uid);

        if (prototypeSelectorCtx.currentRework) {
            searchParams.set("type", prototypeSelectorCtx.currentRework.type);
        }

        fetch(
            `/api/ppboard/prototype/getuserprofile?${searchParams.toString()}`,
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
                let playData = rawData.data;

                setLastUpdate(playData.lastUpdate);
                setData(playData);

                let accSum = 0;
                let weight = 0;

                for (let i = 0; i < playData.pp.length; ++i) {
                    accSum += playData.pp[i].accuracy * Math.pow(0.95, i);
                    weight += Math.pow(0.95, i);
                }

                setWeightedAccuracy(accSum / weight || 0);

                prototypeSelectorCtx.setReworks(rawData.reworks);
                prototypeSelectorCtx.setCurrentRework(rawData.currentRework);
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
    }, [prototypeSelectorCtx.currentRework?.type, uid]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            {data ? (
                <Head
                    description={`${data.username}'s prototype profile in Elaina PP Project.`}
                    title={`PP Board - ${data.username}`}
                />
            ) : (
                <Head
                    description="A player's prototype profile in Elaina PP Project."
                    title="PP Board - Prototype Player Profile"
                />
            )}

            <h2 className="subtitle">
                {data === undefined
                    ? "Loading player information..."
                    : data === null
                    ? "Player not found!"
                    : `Player Profile: ${data.username}`}
            </h2>

            {data ? (
                <>
                    <PrototypeDisclaimer />
                    <br />
                    <PrototypeSelector />
                    <PrototypeDescription />
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
                                    {(data.pptotal - data.prevpptotal).toFixed(
                                        2
                                    )}
                                </td>
                            </tr>
                            <tr>
                                <th>Accuracy</th>
                                <td>{weightedAccuracy?.toFixed(2) || 0}%</td>
                            </tr>
                            <tr>
                                <th>Last Update</th>
                                <td>{new Date(lastUpdate!).toUTCString()}</td>
                            </tr>
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
