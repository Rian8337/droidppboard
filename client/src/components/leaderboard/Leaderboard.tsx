import LeaderboardTable from "./LeaderboardTable";
import SearchBar from "../SearchBar";
import Head from "../Head";
import { motion } from "framer-motion";
import Paging from "../Paging";
import PrototypeDisclaimer from "../PrototypeDisclaimer";
import { useContext } from "react";
import PrototypeLeaderboardNavigator from "../../hooks/PrototypeLeaderboardNavigator";
import MainLeaderboardNavigator from "../../hooks/MainLeaderboardNavigator";
import "../../styles/main.css";
import { PPModes } from "../../interfaces/PPModes";
import { LeaderboardSettings } from "../../interfaces/LeaderboardSettings";
import InGameLeaderboardNavigator from "../../hooks/InGameLeaderboardNavigator";
import InGameDescription from "../InGameDescription";
import PrototypeSelector from "../PrototypeSelector";
import PrototypeDescription from "../PrototypeDescription";

export default function Leaderboard(props: { mode: PPModes }) {
    let ctx: LeaderboardSettings;

    switch (props.mode) {
        case PPModes.live:
            // eslint-disable-next-line react-hooks/rules-of-hooks
            ctx = useContext(MainLeaderboardNavigator);
            break;
        case PPModes.prototype:
            // eslint-disable-next-line react-hooks/rules-of-hooks
            ctx = useContext(PrototypeLeaderboardNavigator);
            break;
        case PPModes.inGame:
            // eslint-disable-next-line react-hooks/rules-of-hooks
            ctx = useContext(InGameLeaderboardNavigator);
            break;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            <Head
                description="View the rankings of Elaina PP Project."
                title={`PP Board - ${
                    props.mode === PPModes.inGame
                        ? "In-Game "
                        : props.mode === PPModes.prototype
                        ? "Prototype "
                        : ""
                }Leaderboard`}
            />

            <h2 className="subtitle">
                Official{" "}
                {props.mode === PPModes.inGame
                    ? "In-Game"
                    : props.mode === PPModes.prototype
                    ? "Prototype"
                    : ""}{" "}
                Player Leaderboard
            </h2>

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
                    <PrototypeDescription />
                    <hr />
                </>
            ) : null}

            <h3 className="description">
                Click/tap on a player&apos;s name to visit their profile page.
            </h3>

            <SearchBar
                state={ctx}
                searchPlaceholder="Search players..."
                submitPlaceholder="Search"
            />

            <Paging state={ctx} />

            <LeaderboardTable {...props} />

            {ctx.data.length > 0 && <Paging state={ctx} />}
        </motion.div>
    );
}
