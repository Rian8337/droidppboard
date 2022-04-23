import { motion } from "framer-motion";
import { useContext } from "react";
import Head from "../components/Head";
import SearchBar from "../components/SearchBar";
import WhitelistTable from "../components/whitelist/WhitelistTable";
import WhitelistNavigator from "../hooks/WhitelistNavigator";
import { WhitelistSetting } from "../interfaces/WhitelistSetting";
import "../styles/main.css";

export default function Whitelist() {
    const ctx: WhitelistSetting = useContext(WhitelistNavigator);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            <Head
                description="List of whitelisted beatmaps in Elaina PP Project."
                title="PP Board - Whitelist"
            />
            <h2 className="subtitle">Whitelisted Beatmaps</h2>
            <h3 className="description">
                Click/tap on a beatmap&apos;s name to visit its osu!page.
            </h3>
            <SearchBar
                state={ctx}
                searchPlaceholder="Search/filter beatmaps..."
                submitPlaceholder="Apply"
            />
            <WhitelistTable />
        </motion.div>
    );
}
