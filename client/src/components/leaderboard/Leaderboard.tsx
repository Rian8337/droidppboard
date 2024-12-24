import LeaderboardTable from "./LeaderboardTable";
import SearchBar from "../SearchBar";
import Head from "../Head";
import { motion } from "framer-motion";
import Paging from "../Paging";
import PrototypeDisclaimer from "../PrototypeDisclaimer";
import { useContext } from "react";
import PrototypeLeaderboardNavigator from "../../hooks/PrototypeLeaderboardNavigator";
import "../../styles/main.css";
import PrototypeSelector from "../PrototypeSelector";
import PrototypeDescription from "../PrototypeDescription";

export default function Leaderboard() {
    const ctx = useContext(PrototypeLeaderboardNavigator);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            <Head
                description="View the rankings of Prototype Droid PP."
                title="PP Board - Prototype Leaderboard"
            />

            <h2 className="subtitle">Official Prototype Player Leaderboard</h2>

            <PrototypeDisclaimer />
            <br />
            <PrototypeSelector />
            <PrototypeDescription />
            <hr />

            <h3 className="description">
                Click/tap on a player&apos;s name to visit their profile page.
            </h3>

            <SearchBar
                state={ctx}
                searchPlaceholder="Search players..."
                submitPlaceholder="Search"
            />

            <Paging state={ctx} />

            <LeaderboardTable />

            {ctx.data.length > 0 && <Paging state={ctx} />}
        </motion.div>
    );
}
