import { PPEntry, PrototypePPEntry } from "app-structures";
import { motion } from "framer-motion";
import { useContext, useEffect } from "react";
import Head from "./Head";
import PlayList from "./PlayList";
import SearchBar from "./SearchBar";
import { Util } from "../Util";
import { TopPlaysSetting } from "../interfaces/TopPlaysSetting";
import PrototypeDescription from "./PrototypeDescription";
import PrototypeTopPlaysNavigator from "../contexts/PrototypeTopPlaysNavigator";
import MainTopPlaysNavigator from "../contexts/MainTopPlaysNavigator";

export default function TopPlays(props: { prototype: boolean }) {
    let ctx: TopPlaysSetting<PrototypePPEntry> | TopPlaysSetting<PPEntry>;

    if (props.prototype) {
        ctx = useContext(PrototypeTopPlaysNavigator);
    } else {
        ctx = useContext(MainTopPlaysNavigator);
    }

    useEffect(() => {
        fetch(
            `${Util.getDomain()}/api/${
                props.prototype ? "prototype/" : ""
            }gettopplays${ctx.query ? `?mods=${ctx.query}` : ""}`
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
                ctx.setSearchReady(true);
            })
            .catch((e: Error) => {
                ctx.setData([]);
                ctx.setErrorMessage(e.message);
            });
    }, [ctx.query]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div>
                <Head
                    description={`${
                        props.prototype ? "Prototype " : ""
                    }Top PP plays in Elaina PP Project.`}
                    title={`PP Board - ${
                        props.prototype ? "Prototype " : ""
                    }Top Plays`}
                />
                {ctx.data.length === 0 ? (
                    <h2 className="subtitle">
                        {ctx.isSearchReady || ctx.errorMessage
                            ? "No data found!"
                            : "Loading play data..."}
                    </h2>
                ) : (
                    <div>
                        <h2 className="subtitle">{`Top PP ${
                            props.prototype ? "Prototype " : ""
                        }Plays`}</h2>
                        {props.prototype ? <PrototypeDescription /> : null}
                    </div>
                )}
                {ctx.errorMessage ? (
                    <h3 className="error-message">
                        Error: {ctx.errorMessage}.
                    </h3>
                ) : null}
                {ctx.isSearchReady ? (
                    <SearchBar
                        state={ctx}
                        searchPlaceholder="Filter mods..."
                        submitPlaceholder="Filter"
                    />
                ) : null}
                {ctx.data.length > 0 ? <PlayList data={ctx.data} /> : null}
                Top PP will be updated every {props.prototype ? 10 : 30}{" "}
                minutes. If you do not see any play, please reload the page
                after {props.prototype ? "1-2" : "5-10"} minutes.
            </div>
        </motion.div>
    );
}
