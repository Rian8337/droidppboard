import { useContext, useEffect, useMemo, useRef } from "react";
import LeaderboardItem from "./LeaderboardItem";
import PrototypeLeaderboardNavigator from "../../hooks/PrototypeLeaderboardNavigator";
import { IPrototypePP, PrototypeLeaderboardResponse } from "app-structures";
import "../../styles/table-listing.css";
import PrototypeSelectorNavigator from "../../hooks/PrototypeSelectorNavigator";
import { useParams } from "react-router-dom";
import AuthContext from "../../hooks/AuthContext";
import { Util } from "../../Util";

export default function LeaderboardTable() {
    const leaderboardCtx = useContext(PrototypeLeaderboardNavigator);
    const prototypeSelectorCtx = useContext(PrototypeSelectorNavigator);
    const authCtx = useContext(AuthContext);

    const { type } = useParams();
    const typeRef = useRef(type);

    useEffect(() => {
        // Wait for the login state, as it decides which variants are visible.
        if (!authCtx.isLoaded) {
            return;
        }

        // Special case when the user loads this page with a type in the URL.
        if (
            typeRef.current &&
            typeRef.current !== prototypeSelectorCtx.currentVariant?.name
        ) {
            prototypeSelectorCtx.resetCurrentVariant(typeRef.current);

            // Invalidate the ref so that we don't keep setting the variant to unknown.
            typeRef.current = undefined;

            return;
        }

        leaderboardCtx.setData(undefined);
        leaderboardCtx.setErrorMessage(undefined);
        leaderboardCtx.setEnablePaging(false);
        leaderboardCtx.setSearchReady(false);

        const searchParams = new URLSearchParams();
        const controller = new AbortController();

        searchParams.set("page", leaderboardCtx.internalPage.toString());

        if (leaderboardCtx.query) {
            searchParams.set("query", leaderboardCtx.query);
        }

        if (prototypeSelectorCtx.currentVariant?.name) {
            searchParams.set("type", prototypeSelectorCtx.currentVariant.name);
        }

        fetch(
            `/api/ppboard/prototype/getleaderboard?${searchParams.toString()}`,
            { signal: controller.signal }
        )
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(await Util.getResponseErrorMessage(res));
                }

                return res.json();
            })
            .then((rawData: PrototypeLeaderboardResponse<IPrototypePP[]>) => {
                leaderboardCtx.setData(rawData.data);
                leaderboardCtx.setCurrentPage(leaderboardCtx.internalPage);

                prototypeSelectorCtx.setVariants(rawData.variants);
                prototypeSelectorCtx.setCurrentVariant(rawData.currentVariant);
            })
            .catch((e: Error) => {
                if (e.name === "AbortError") {
                    return;
                }

                leaderboardCtx.setErrorMessage(e.message);
            })
            .finally(() => {
                leaderboardCtx.setEnablePaging(true);
                leaderboardCtx.setSearchReady(true);
            });

        return () => controller.abort();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        leaderboardCtx.internalPage,
        leaderboardCtx.query,
        prototypeSelectorCtx.currentVariant?.name,
        authCtx.isLoaded,
        authCtx.user?.uid,
    ]);

    const hasMaster = useMemo(
        () => leaderboardCtx.data.at(0)?.masterPPTotal !== undefined,
        [leaderboardCtx.data]
    );

    return leaderboardCtx.data.length === 0 ? (
        <>
            <h2 className="subtitle">
                {leaderboardCtx.isSearchReady || leaderboardCtx.errorMessage
                    ? "No players found! Please try again later."
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
                        <th style={{ width: "6%" }}>No.</th>
                        <th style={{ width: hasMaster ? "26.5%" : "34%" }}>
                            Player
                        </th>
                        <th style={{ width: hasMaster ? "17.5%" : "20%" }}>
                            Live
                        </th>
                        {hasMaster && (
                            <th style={{ width: "17.5%" }}>Master</th>
                        )}
                        <th style={{ width: hasMaster ? "17.5%" : "20%" }}>
                            Local
                        </th>
                        <th style={{ width: hasMaster ? "15%" : "20%" }}>
                            Diff
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {leaderboardCtx.data.map((v, i) => {
                        return (
                            <LeaderboardItem
                                key={`${v.uid}:${
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
