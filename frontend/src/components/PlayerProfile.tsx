import { PrototypePP, UserBind } from "app-database";
import { useState, useEffect } from "react";
import { useParams } from "react-router";
import "../styles/modules/components/PlayerProfile.module.css";
import PlayList from "./PlayList";
import Head from "./Head";
import { motion } from "framer-motion";
import { Util } from "../Util";
import PrototypeDescription from "./PrototypeDescription";

export default function PlayerProfile(props: { prototype: boolean }) {
    const { uid } = useParams();
    const [data, setData] = useState<UserBind | PrototypePP | null | undefined>(
        undefined
    );
    const [rank, setRank] = useState<number | null>(null);
    const [prevRank, setPrevRank] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(
        undefined
    );

    const parsedUid: number = parseInt(uid || "");

    useEffect(() => {
        if (isNaN(parsedUid)) {
            return setData(null);
        }

        fetch(
            `${Util.getDomain()}/api/${
                props.prototype ? "prototype/" : ""
            }getuserprofile?uid=${uid}`
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
                if (props.prototype) {
                    setPrevRank(rawData.prevpprank);
                }
                setRank(rawData.pprank);
                setData(
                    props.prototype
                        ? new PrototypePP(rawData)
                        : new UserBind(rawData)
                );
            })
            .catch((e: Error) => {
                setData(null);
                setErrorMessage(e.message);
            });
    }, [uid]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            {!data ? (
                <div>
                    <Head
                        description={`A player's ${
                            props.prototype ? "prototype" : ""
                        }profile in Elaina PP Project.`}
                        title={`PP Board - ${
                            props.prototype ? "Prototype " : ""
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
                </div>
            ) : (
                <div>
                    <Head
                        description={`${data.username}'s ${
                            props.prototype ? "prototype " : ""
                        }profile in Elaina PP Project.`}
                        title={`PP Board - ${data.username}`}
                    />
                    <h2 className="subtitle">
                        Player Profile: {data.username}
                    </h2>
                    {props.prototype ? <PrototypeDescription /> : null}
                    <table>
                        {data instanceof UserBind ? (
                            <tbody>
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
                            </tbody>
                        ) : (
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
                                        {(rank! - prevRank!).toLocaleString()}
                                    </td>
                                </tr>
                            </tbody>
                        )}
                    </table>
                    <PlayList data={data.pp} />
                </div>
            )}
        </motion.div>
    );
}
