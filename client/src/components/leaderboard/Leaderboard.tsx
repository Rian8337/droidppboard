import LeaderboardTable from "./LeaderboardTable";
import SearchBar from "../SearchBar";
import Head from "../Head";
import { motion } from "framer-motion";
import { LeaderboardSetting } from "../../interfaces/LeaderboardSetting";
import Paging from "../Paging";
import PrototypeDescription from "../PrototypeDescription";
import { useContext } from "react";
import PrototypeLeaderboardNavigator from "../../hooks/PrototypeLeaderboardNavigator";
import MainLeaderboardNavigator from "../../hooks/MainLeaderboardNavigator";
import { IPrototypePP, IUserBind } from "app-structures";
import "../../styles/main.css";

export default function Leaderboard(props: { prototype: boolean }) {
    let ctx: LeaderboardSetting<IUserBind> | LeaderboardSetting<IPrototypePP>;

    if (props.prototype) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        ctx = useContext(PrototypeLeaderboardNavigator);
    } else {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        ctx = useContext(MainLeaderboardNavigator);
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
                    props.prototype ? "Prototype " : ""
                }Leaderboard`}
            />
            <h2 className="subtitle">
                Official {props.prototype ? "Prototype" : ""} Player Leaderboard
            </h2>
            {props.prototype ? <PrototypeDescription /> : null}
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
        </motion.div>
    );
}
