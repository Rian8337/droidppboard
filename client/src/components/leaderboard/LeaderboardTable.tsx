import { useContext, useEffect } from "react";
import LeaderboardItem from "./LeaderboardItem";
import { Util } from "../../Util";
import { TableSetting } from "../../interfaces/TableSetting";
import MainLeaderboardNavigator from "../../hooks/MainLeaderboardNavigator";
import PrototypeLeaderboardNavigator from "../../hooks/PrototypeLeaderboardNavigator";
import {
    IInGamePP,
    IPrototypePP,
    IUserBind,
    PrototypeLeaderboardResponse,
} from "app-structures";
import "../../styles/table-listing.css";
import { PPModes } from "../../interfaces/PPModes";
import { LeaderboardSettings } from "../../interfaces/LeaderboardSettings";
import InGameLeaderboardNavigator from "../../hooks/InGameLeaderboardNavigator";
import PrototypeSelectorNavigator from "../../hooks/PrototypeSelectorNavigator";

export default function LeaderboardTable(props: { mode: PPModes }) {
    let leaderboardCtx: LeaderboardSettings;
    const prototypeSelectorCtx = useContext(PrototypeSelectorNavigator);

    switch (props.mode) {
        case PPModes.live:
            // eslint-disable-next-line react-hooks/rules-of-hooks
            leaderboardCtx = useContext(MainLeaderboardNavigator);
            break;
        case PPModes.prototype:
            // eslint-disable-next-line react-hooks/rules-of-hooks
            leaderboardCtx = useContext(PrototypeLeaderboardNavigator);
            break;
        case PPModes.inGame:
            // eslint-disable-next-line react-hooks/rules-of-hooks
            leaderboardCtx = useContext(InGameLeaderboardNavigator);
            break;
    }

    useEffect(() => {
        leaderboardCtx.setEnablePaging(false);
        leaderboardCtx.setSearchReady(false);

        let subpath = "";

        switch (props.mode) {
            case PPModes.prototype:
                subpath = "prototype/";
                break;
            case PPModes.inGame:
                subpath = "ingame/";
                break;
        }

        const searchParams = new URLSearchParams();

        searchParams.set("page", leaderboardCtx.internalPage.toString());

        if (leaderboardCtx.query) {
            searchParams.set("query", leaderboardCtx.query);
        }

        if (prototypeSelectorCtx.currentRework) {
            searchParams.set("type", prototypeSelectorCtx.currentRework.type);
        }

        fetch(
            `/api/ppboard/${subpath}getleaderboard?${searchParams.toString()}`
        )
            .then((res) => {
                if (res.status === 429) {
                    throw new Error(
                        "You are being rate limited. Please try again later"
                    );
                }

                return res.json();
            })
            .then(
                (
                    rawData:
                        | IUserBind[]
                        | PrototypeLeaderboardResponse<IPrototypePP>
                        | IInGamePP[]
                ) => {
                    console.log(rawData);

                    if (Array.isArray(rawData)) {
                        if (Util.isInGame(rawData)) {
                            (
                                leaderboardCtx as unknown as TableSetting<IInGamePP>
                            ).setData(rawData as IInGamePP[]);
                        } else {
                            (
                                leaderboardCtx as unknown as TableSetting<IUserBind>
                            ).setData(rawData as IUserBind[]);
                        }
                    } else {
                        (
                            leaderboardCtx as unknown as TableSetting<IPrototypePP>
                        ).setData(rawData.data);

                        prototypeSelectorCtx.setReworks(rawData.reworks);
                        prototypeSelectorCtx.setCurrentRework(
                            rawData.currentRework
                        );
                    }

                    leaderboardCtx.setCurrentPage(leaderboardCtx.internalPage);
                }
            )
            .catch((e: Error) => {
                leaderboardCtx.setData([]);
                leaderboardCtx.setErrorMessage(e.message);
            })
            .finally(() => {
                leaderboardCtx.setEnablePaging(true);
                leaderboardCtx.setSearchReady(true);
            });

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        leaderboardCtx.internalPage,
        leaderboardCtx.query,
        prototypeSelectorCtx.currentRework?.type,
    ]);

    return leaderboardCtx.data.length === 0 ? (
        <>
            <h2 className="subtitle">
                {leaderboardCtx.isSearchReady || leaderboardCtx.errorMessage
                    ? "No players found!"
                    : "Loading players..."}
            </h2>
            {leaderboardCtx.errorMessage ? (
                <h3 className="error-message">
                    Error: {leaderboardCtx.errorMessage}.
                </h3>
            ) : null}
        </>
    ) : (
        <div className="table-container">
            <table className="listing">
                <thead>
                    <tr>
                        <th style={{ width: "5%" }}>No.</th>
                        <th style={{ width: "15%" }}>UID</th>
                        <th
                            style={{
                                width: Util.isPrototype(
                                    leaderboardCtx.data as IUserBind[]
                                )
                                    ? "22.5%"
                                    : "40%",
                            }}
                        >
                            Username
                        </th>
                        <th style={{ width: "20%" }}>
                            {props.mode === PPModes.live
                                ? "Play Count"
                                : "Live PP"}
                        </th>
                        <th style={{ width: "20%" }}>
                            {props.mode === PPModes.live ? "PP" : "Local PP"}
                        </th>
                        {props.mode === PPModes.live ? null : (
                            <th style={{ width: "17.5%" }}>Diff</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {leaderboardCtx.data.map((v, i) => {
                        return (
                            <LeaderboardItem
                                key={`${v.discordid}:${
                                    (leaderboardCtx.currentPage - 1) * 50 +
                                    i +
                                    1
                                }`}
                                data={v}
                                page={leaderboardCtx.currentPage}
                                index={i}
                            />
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
