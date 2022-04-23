import { useContext, useEffect } from "react";
import LeaderboardItem from "./LeaderboardItem";
import { Util } from "../../Util";
import { LeaderboardSetting } from "../../interfaces/LeaderboardSetting";
import MainLeaderboardNavigator from "../../hooks/MainLeaderboardNavigator";
import PrototypeLeaderboardNavigator from "../../hooks/PrototypeLeaderboardNavigator";
import { IPrototypePP, IUserBind } from "app-structures";
import "../../styles/table-listing.css";

export default function LeaderboardTable(props: { prototype: boolean }) {
    let ctx: LeaderboardSetting<IUserBind> | LeaderboardSetting<IPrototypePP>;

    if (props.prototype) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        ctx = useContext(PrototypeLeaderboardNavigator);
    } else {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        ctx = useContext(MainLeaderboardNavigator);
    }

    useEffect(() => {
        ctx.setEnablePaging(false);
        ctx.setSearchReady(false);

        fetch(
            `/api/${props.prototype ? "prototype/" : ""}getleaderboard?page=${
                ctx.internalPage
            }${ctx.query ? `&query=${ctx.query}` : ""}`
        )
            .then((res) => {
                if (res.status === 429) {
                    throw new Error(
                        "You are being rate limited. Please try again later"
                    );
                }

                return res.json();
            })
            .then((rawData: IUserBind[] | IPrototypePP[]) => {
                if (rawData.length > 0) {
                    if (Util.isPrototype(rawData)) {
                        (
                            ctx as unknown as LeaderboardSetting<IPrototypePP>
                        ).setData(rawData as IPrototypePP[]);
                    } else {
                        (
                            ctx as unknown as LeaderboardSetting<IUserBind>
                        ).setData(rawData as IUserBind[]);
                    }
                } else {
                    ctx.setData([]);
                }
                ctx.setCurrentPage(ctx.internalPage);
            })
            .catch((e: Error) => {
                ctx.setData([]);
                ctx.setErrorMessage(e.message);
            })
            .finally(() => {
                ctx.setEnablePaging(true);
                ctx.setSearchReady(true);
            });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ctx.internalPage, ctx.query]);

    return ctx.data.length === 0 ? (
        <>
            <h2 className="subtitle">
                {ctx.isSearchReady || ctx.errorMessage
                    ? "No players found!"
                    : "Loading players..."}
            </h2>
            {ctx.errorMessage ? (
                <h3 className="error-message">Error: {ctx.errorMessage}.</h3>
            ) : null}
        </>
    ) : (
        <table className="listing">
            <thead>
                <tr>
                    <th style={{ width: "5%" }}>No.</th>
                    <th style={{ width: "15%" }}>UID</th>
                    <th
                        style={{
                            width: Util.isPrototype(ctx.data as IUserBind[])
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
                                (ctx.currentPage - 1) * 50 + i + 1
                            }`}
                            data={v}
                            page={ctx.currentPage}
                            index={i}
                        />
                    );
                })}
            </tbody>
        </table>
    );
}
