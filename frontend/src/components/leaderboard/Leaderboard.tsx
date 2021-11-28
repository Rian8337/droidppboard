import LeaderboardTable from "./LeaderboardTable";
import "../../styles/modules/components/leaderboard/Leaderboard.module.css";
import SearchBar from "../SearchBar";
import Head from "../Head";
import { motion } from "framer-motion";
import { LeaderboardSetting } from "../../interfaces/LeaderboardSetting";
import { PrototypePP, UserBind } from "app-database";
import Paging from "../Paging";
import PrototypeDescription from "../PrototypeDescription";
import { useContext } from "react";
import PrototypeLeaderboardNavigator from "../../contexts/PrototypeLeaderboardNavigator";
import MainLeaderboardNavigator from "../../contexts/MainLeaderboardNavigator";

export default function Leaderboard(props: { prototype: boolean }) {
    let ctx: LeaderboardSetting<UserBind> | LeaderboardSetting<PrototypePP>;

    if (props.prototype) {
        ctx = useContext(PrototypeLeaderboardNavigator);
    } else {
        ctx = useContext(MainLeaderboardNavigator);
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div>
                <Head
                    description="View the rankings of Elaina PP Project."
                    title={`PP Board - ${
                        props.prototype ? "Prototype " : ""
                    }Leaderboard`}
                />
                <h2 className="subtitle">
                    Official {props.prototype ? "Prototype" : ""} Player
                    Leaderboard
                </h2>
                {props.prototype ? <PrototypeDescription /> : null}
                <h3 className="description">
                    Click/tap on a player&apos;s name to visit their profile
                    page.
                </h3>
                <SearchBar
                    state={ctx}
                    searchPlaceholder="Search players..."
                    submitPlaceholder="Search"
                />
                <Paging state={ctx} />
                <LeaderboardTable {...props} />
            </div>
        </motion.div>
    );
}
