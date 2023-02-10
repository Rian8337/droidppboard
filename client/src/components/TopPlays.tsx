import { motion } from "framer-motion";
import { useContext, useEffect } from "react";
import Head from "./Head";
import PlayList from "./PlayList";
import SearchBar from "./SearchBar";
import PrototypeDescription from "./PrototypeDescription";
import PrototypeTopPlaysNavigator from "../hooks/PrototypeTopPlaysNavigator";
import MainTopPlaysNavigator from "../hooks/MainTopPlaysNavigator";
import OldTopPlaysNavigator from "../hooks/OldTopPlaysNavigator";
import { Util } from "../Util";
import { TopPlaysSettings } from "../interfaces/TopPlaysSettings";
import { PPModes } from "../interfaces/PPModes";
import OldDescription from "./OldDescription";

export default function TopPlays(props: { mode: PPModes }) {
    let ctx: TopPlaysSettings;

    switch (props.mode) {
        case PPModes.live:
            // eslint-disable-next-line react-hooks/rules-of-hooks
            ctx = useContext(MainTopPlaysNavigator);
            break;
        case PPModes.prototype:
            // eslint-disable-next-line react-hooks/rules-of-hooks
            ctx = useContext(PrototypeTopPlaysNavigator);
            break;
        case PPModes.old:
            // eslint-disable-next-line react-hooks/rules-of-hooks
            ctx = useContext(OldTopPlaysNavigator);
            break;
    }

    useEffect(() => {
        const modCombinations = Util.parseMods(ctx.query);

        if (modCombinations?.length === 0) {
            return;
        }

        const debounce = setTimeout(() => {
            fetch(
                `/api/ppboard/${
                    props.mode === PPModes.prototype
                        ? "prototype/"
                        : props.mode === PPModes.old
                        ? "old/"
                        : ""
                }gettopplays${
                    modCombinations ? `?mods=${modCombinations}` : ""
                }`
            )
                .then((res) => {
                    if (res.status === 429) {
                        throw new Error(
                            "You are being rate limited. Please try again later"
                        );
                    }

                    return res.json();
                })
                .then((rawData) => {
                    ctx.setData(rawData);
                })
                .catch((e: Error) => {
                    ctx.setData([]);
                    ctx.setErrorMessage(e.message);
                })
                .finally(() => {
                    ctx.setSearchReady(true);
                });
        }, 500);

        return () => clearTimeout(debounce);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ctx.query]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            <Head
                description={`${
                    props.mode === PPModes.prototype
                        ? "Prototype "
                        : props.mode === PPModes.old
                        ? "Old "
                        : ""
                }Top PP plays in Elaina PP Project.`}
                title={`PP Board - ${
                    props.mode === PPModes.prototype
                        ? "Prototype "
                        : props.mode === PPModes.old
                        ? "Old "
                        : ""
                }Top Plays`}
            />
            {ctx.data.length === 0 ? (
                <h2 className="subtitle">
                    {ctx.isSearchReady || ctx.errorMessage
                        ? "No data found!"
                        : "Loading play data..."}
                </h2>
            ) : (
                <>
                    <h2 className="subtitle">{`Top PP ${
                        props.mode === PPModes.prototype
                            ? "Prototype "
                            : props.mode === PPModes.old
                            ? "Old "
                            : ""
                    }Plays`}</h2>
                    {props.mode === PPModes.prototype ? (
                        <PrototypeDescription />
                    ) : props.mode === PPModes.old ? (
                        <OldDescription />
                    ) : null}
                </>
            )}
            {ctx.errorMessage ? (
                <h3 className="error-message">Error: {ctx.errorMessage}.</h3>
            ) : null}
            {ctx.isSearchReady ? (
                <SearchBar
                    state={ctx}
                    searchPlaceholder="Filter mods..."
                    submitPlaceholder="Filter"
                />
            ) : null}
            {ctx.data.length > 0 ? <PlayList data={ctx.data} /> : null}
            Top PP will be updated every{" "}
            {props.mode === PPModes.prototype ? 10 : 30} minutes. If you do not
            see any play, please reload the page after{" "}
            {props.mode === PPModes.prototype ? "1-2" : "5-10"} minutes.
        </motion.div>
    );
}
