import {
    DatabasePrototypePP,
    DatabaseUserBind,
    PrototypePP,
    UserBind,
} from "app-database";
import { useContext, useEffect } from "react";
import LeaderboardItem from "./LeaderboardItem";
import "../../styles/modules/components/leaderboard/LeaderboardTable.module.css";
import { Util } from "../../Util";
import { LeaderboardSetting } from "../../interfaces/LeaderboardSetting";
import MainLeaderboardNavigator from "../../contexts/MainLeaderboardNavigator";
import PrototypeLeaderboardNavigator from "../../contexts/PrototypeLeaderboardNavigator";

export default function LeaderboardTable(props: { prototype: boolean }) {
    let ctx: LeaderboardSetting<UserBind> | LeaderboardSetting<PrototypePP>;

    if (props.prototype) {
        ctx = useContext(PrototypeLeaderboardNavigator);
    } else {
        ctx = useContext(MainLeaderboardNavigator);
    }

    useEffect(() => {
        ctx.setEnablePaging(false);
        ctx.setSearchReady(false);

        const debounce: NodeJS.Timeout = setTimeout(() => {
            fetch(
                `${Util.getDomain()}/api/${
                    props.prototype ? "prototype/" : ""
                }getleaderboard?page=${ctx.page}${
                    ctx.query ? `&query=${ctx.query}` : ""
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
                .then((rawData: DatabaseUserBind[] | DatabasePrototypePP[]) => {
                    if (rawData.length > 0) {
                        if (Util.isPrototype(rawData)) {
                            (
                                ctx as unknown as LeaderboardSetting<PrototypePP>
                            ).setData(rawData.map((v) => new PrototypePP(v)));
                        } else {
                            (
                                ctx as unknown as LeaderboardSetting<UserBind>
                            ).setData(rawData.map((v) => new UserBind(v)));
                        }
                    } else {
                        ctx.setData([]);
                    }
                    ctx.setEnablePaging(true);
                    ctx.setSearchReady(true);
                })
                .catch((e: Error) => {
                    ctx.setData([]);
                    ctx.setErrorMessage(e.message);
                });
        }, 500);

        return () => clearTimeout(debounce);
    }, [ctx.page, ctx.query]);

    return ctx.data.length === 0 ? (
        <div>
            <h2 className="subtitle">
                {ctx.isSearchReady || ctx.errorMessage
                    ? "No players found!"
                    : "Loading players..."}
            </h2>
            {ctx.errorMessage ? (
                <h3 className="error-message">Error: {ctx.errorMessage}.</h3>
            ) : null}
        </div>
    ) : (
        <div>
            <table className="listing">
                <thead>
                    <tr>
                        <th style={{ width: "5%" }}>No.</th>
                        <th style={{ width: "15%" }}>UID</th>
                        <th
                            style={{
                                width: Util.isPrototype(ctx.data as UserBind[])
                                    ? "22.5%"
                                    : "40%",
                            }}
                        >
                            Username
                        </th>
                        <th style={{ width: "20%" }}>
                            {props.prototype ? "Live PP" : "Play Count"}
                        </th>
                        <th style={{ width: "20%" }}>
                            {props.prototype ? "Local PP" : "PP"}
                        </th>
                        {props.prototype ? (
                            <th style={{ width: "17.5%" }}>Diff</th>
                        ) : null}
                    </tr>
                </thead>
                <tbody>
                    {ctx.data.map((v, i) => {
                        return (
                            <LeaderboardItem
                                key={`${v.discordid}:${
                                    (ctx.page - 1) * 50 + i + 1
                                }`}
                                data={v}
                                page={ctx.page}
                                index={i}
                            />
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
