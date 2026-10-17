import { motion } from "framer-motion";
import { useContext, useEffect, useRef } from "react";
import Head from "./Head";
import PlayList from "./PlayList";
import SearchBar from "./SearchBar";
import PrototypeDisclaimer from "./PrototypeDisclaimer";
import PrototypeTopPlaysNavigator from "../hooks/PrototypeTopPlaysNavigator";
import { Util } from "../Util";
import PrototypeSelectorNavigator from "../hooks/PrototypeSelectorNavigator";
import AuthContext from "../hooks/AuthContext";
import PrototypeSelector from "./PrototypeSelector";
import {
    PrototypeLeaderboardResponse,
    TopPrototypePPEntry,
} from "app-structures";
import { useParams } from "react-router-dom";
import PrototypeDescription from "./PrototypeDescription";

export default function TopPlays() {
    const topPlayCtx = useContext(PrototypeTopPlaysNavigator);
    const prototypeSelectorCtx = useContext(PrototypeSelectorNavigator);
    const authCtx = useContext(AuthContext);

    const { type } = useParams();
    const typeRef = useRef(type);

    useEffect(() => {
        // Wait for the login state, as it decides which variants are visible.
        if (!authCtx.isLoaded) {
            return;
        }

        const modCombinations = Util.parseMods(topPlayCtx.query);

        if (modCombinations === null && topPlayCtx.query) {
            return;
        }

        // Special case when the user loads this page with a type in the URL.
        if (
            typeRef.current &&
            typeRef.current !== prototypeSelectorCtx.currentVariant?.name
        ) {
            prototypeSelectorCtx.resetCurrentVariant(typeRef.current);

            // Invalidate the ref so that we don't keep setting the variant to unknown.
            typeRef.current = undefined;

            return;
        }

        topPlayCtx.setData(undefined);
        topPlayCtx.setErrorMessage(undefined);
        topPlayCtx.setSearchReady(false);

        const searchParams = new URLSearchParams();

        if (modCombinations) {
            searchParams.set("mods", modCombinations.join(""));
        }

        if (prototypeSelectorCtx.currentVariant) {
            searchParams.set("type", prototypeSelectorCtx.currentVariant.name);
        }

        const debounce = setTimeout(() => {
            fetch(
                `/api/ppboard/prototype/gettopplays?${searchParams.toString()}`
            )
                .then(async (res) => {
                    if (!res.ok) {
                        throw new Error(
                            await Util.getResponseErrorMessage(res)
                        );
                    }

                    return res.json();
                })
                .then(
                    (
                        rawData: PrototypeLeaderboardResponse<
                            TopPrototypePPEntry[]
                        >
                    ) => {
                        prototypeSelectorCtx.setVariants(rawData.variants);
                        prototypeSelectorCtx.setCurrentVariant(
                            rawData.currentVariant
                        );

                        topPlayCtx.setData(rawData.data);
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
    }, [
        topPlayCtx.query,
        prototypeSelectorCtx.currentVariant?.name,
        authCtx.isLoaded,
        authCtx.user?.uid,
    ]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            <Head
                description="Prototype Top PP plays"
                title="PP Board - Prototype Top Plays"
            />

            <h2 className="subtitle">Top Prototype PP Plays</h2>

            <PrototypeDisclaimer />
            <br />
            <PrototypeSelector />
            <PrototypeDescription />
            <hr />

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

            <SearchBar
                state={topPlayCtx}
                searchPlaceholder="Filter mods..."
                submitPlaceholder="Filter"
            />

            {topPlayCtx.data.length > 0 ? (
                <PlayList data={topPlayCtx.data} />
            ) : null}

            <div style={{ textAlign: "center", marginTop: 10 }}>
                Top PP will be updated every 30 minutes. If you do not see any
                play, please reload the page after 5-10 minutes.
            </div>
        </motion.div>
    );
}
