import { motion } from "framer-motion";
import { useContext, useEffect, useRef } from "react";
import Head from "./Head";
import PlayList from "./PlayList";
import SearchBar from "./SearchBar";
import PrototypeDisclaimer from "./PrototypeDisclaimer";
import PrototypeTopPlaysNavigator from "../hooks/PrototypeTopPlaysNavigator";
import MainTopPlaysNavigator from "../hooks/MainTopPlaysNavigator";
import { Util } from "../Util";
import { TopPlaysSettings } from "../interfaces/TopPlaysSettings";
import { PPModes } from "../interfaces/PPModes";
import InGameTopPlaysNavigator from "../hooks/InGameTopPlaysNavigator";
import InGameDescription from "./InGameDescription";
import PrototypeSelectorNavigator from "../hooks/PrototypeSelectorNavigator";
import PrototypeSelector from "./PrototypeSelector";
import {
    PPEntry,
    PrototypeLeaderboardResponse,
    PrototypePPEntry,
    TopPrototypePPEntry,
} from "app-structures";
import { TopPlaysSetting } from "../interfaces/TopPlaysSetting";
import { useParams } from "react-router-dom";
import PrototypeDescription from "./PrototypeDescription";

export default function TopPlays(props: { mode: PPModes }) {
    let topPlayCtx: TopPlaysSettings;
    const prototypeSelectorCtx = useContext(PrototypeSelectorNavigator);
    const { type } = useParams();

    const typeRef = useRef(type);

    switch (props.mode) {
        case PPModes.live:
            // eslint-disable-next-line react-hooks/rules-of-hooks
            topPlayCtx = useContext(MainTopPlaysNavigator);
            break;
        case PPModes.prototype:
            // eslint-disable-next-line react-hooks/rules-of-hooks
            topPlayCtx = useContext(PrototypeTopPlaysNavigator);
            break;
        case PPModes.inGame:
            // eslint-disable-next-line react-hooks/rules-of-hooks
            topPlayCtx = useContext(InGameTopPlaysNavigator);
    }

    useEffect(() => {
        const modCombinations = Util.parseMods(topPlayCtx.query);

        if (modCombinations === null && topPlayCtx.query) {
            return;
        }

        // Special case when the user loads this page with a type in the URL.
        if (
            props.mode === PPModes.prototype &&
            typeRef.current &&
            typeRef.current !== prototypeSelectorCtx.currentRework?.type
        ) {
            prototypeSelectorCtx.resetCurrentRework(typeRef.current);

            // Invalidate the ref so that we don't keep setting the rework to unknown.
            typeRef.current = undefined;

            return;
        }

        topPlayCtx.setData(undefined);
        topPlayCtx.setErrorMessage(undefined);
        topPlayCtx.setSearchReady(false);

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

        if (modCombinations) {
            searchParams.set("mods", modCombinations.join(""));
        }

        if (
            props.mode === PPModes.prototype &&
            prototypeSelectorCtx.currentRework
        ) {
            searchParams.set("type", prototypeSelectorCtx.currentRework.type);
        }

        const debounce = setTimeout(() => {
            fetch(
                `/api/ppboard/${subpath}gettopplays?${searchParams.toString()}`
            )
                .then((res) => {
                    if (res.status === 429) {
                        throw new Error(
                            "You are being rate limited. Please try again later"
                        );
                    }

                    return res.json();
                })
                .then(
                    (
                        rawData:
                            | PPEntry[]
                            | PrototypeLeaderboardResponse<TopPrototypePPEntry>
                    ) => {
                        if (Array.isArray(rawData)) {
                            (topPlayCtx as TopPlaysSetting<PPEntry>).setData(
                                rawData
                            );
                        } else {
                            prototypeSelectorCtx.setReworks(rawData.reworks);
                            prototypeSelectorCtx.setCurrentRework(
                                rawData.currentRework
                            );

                            (
                                topPlayCtx as TopPlaysSetting<PrototypePPEntry>
                            ).setData(rawData.data);
                        }
                    }
                )
                .catch((e: Error) => {
                    topPlayCtx.setErrorMessage(e.message);
                })
                .finally(() => {
                    topPlayCtx.setSearchReady(true);
                });
        }, 500);

        return () => clearTimeout(debounce);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [topPlayCtx.query, prototypeSelectorCtx.currentRework?.type]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            <Head
                description={
                    props.mode === PPModes.inGame
                        ? "In-Game Top PP Plays"
                        : `${
                              props.mode === PPModes.prototype
                                  ? "Prototype "
                                  : ""
                          }Top PP plays in Elaina PP Project.`
                }
                title={`PP Board - ${
                    props.mode === PPModes.inGame
                        ? "In-Game "
                        : props.mode === PPModes.prototype
                        ? "Prototype "
                        : ""
                }Top Plays`}
            />

            <h2 className="subtitle">{`Top PP ${
                props.mode === PPModes.inGame
                    ? "In-Game "
                    : props.mode === PPModes.prototype
                    ? "Prototype "
                    : ""
            }Plays`}</h2>

            {props.mode === PPModes.inGame ? (
                <>
                    <InGameDescription />
                    <hr />
                </>
            ) : props.mode === PPModes.prototype ? (
                <>
                    <PrototypeDisclaimer />
                    <br />
                    <PrototypeSelector />
                    <br />
                    <PrototypeDescription />
                    <br />
                    <hr />
                </>
            ) : null}

            {topPlayCtx.data.length === 0 ? (
                <h2 className="subtitle">
                    {topPlayCtx.isSearchReady || topPlayCtx.errorMessage
                        ? "No scores found! Please try again later."
                        : "Loading scores..."}
                </h2>
            ) : null}
            {topPlayCtx.errorMessage ? (
                <h3 className="error-message">
                    Error: {topPlayCtx.errorMessage}.
                </h3>
            ) : null}
            {topPlayCtx.isSearchReady ? (
                <SearchBar
                    state={topPlayCtx}
                    searchPlaceholder="Filter mods..."
                    submitPlaceholder="Filter"
                />
            ) : null}
            {topPlayCtx.data.length > 0 ? (
                <PlayList data={topPlayCtx.data} />
            ) : null}
            <div style={{ textAlign: "center" }}>
                Top PP will be updated every 30 minutes. If you do not see any
                play, please reload the page after 5-10 minutes.
            </div>
        </motion.div>
    );
}
