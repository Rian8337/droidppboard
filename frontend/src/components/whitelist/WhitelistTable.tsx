import { MapWhitelist, DatabaseMapWhitelist } from "app-database";
import { useContext, useEffect } from "react";
import "../../styles/modules/components/whitelist/WhitelistTable.module.css";
import Paging from "../Paging";
import { WhitelistSetting } from "../../interfaces/WhitelistSetting";
import WhitelistItem from "./WhitelistItem";
import { Util } from "../../Util";
import WhitelistBeatmapFilter from "./WhitelistBeatmapFilter";
import WhitelistNavigator from "../../contexts/WhitelistNavigator";

export default function WhitelistTable() {
    const ctx: WhitelistSetting = useContext(WhitelistNavigator);

    useEffect(() => {
        ctx.setEnablePaging(false);
        ctx.setSearchReady(false);

        const debounce: NodeJS.Timeout = setTimeout(() => {
            fetch(
                `${Util.getDomain()}/api/getwhitelist?page=${ctx.page}${
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
                .then((rawData: DatabaseMapWhitelist[]) => {
                    ctx.setData(rawData.map((v) => new MapWhitelist(v)));
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
                {ctx.query || ctx.errorMessage
                    ? "No beatmaps found!"
                    : "Loading beatmaps..."}
            </h2>
            {ctx.errorMessage ? (
                <h3 className="error-message">Error: {ctx.errorMessage}.</h3>
            ) : null}
        </div>
    ) : (
        <div>
            <Paging state={ctx} />
            <table className="listing">
                <thead>
                    <tr>
                        <th style={{ width: "40%" }}>Beatmap Name</th>
                        <th style={{ width: "10%" }}>CS</th>
                        <th style={{ width: "10%" }}>AR</th>
                        <th style={{ width: "10%" }}>OD</th>
                        <th style={{ width: "10%" }}>HP</th>
                        <th style={{ width: "10%" }}>SR</th>
                        <th style={{ width: "10%" }}>BPM</th>
                    </tr>
                </thead>
                <tbody>
                    {ctx.data.map((v) => {
                        return <WhitelistItem key={v.mapid} data={v} />;
                    })}
                </tbody>
            </table>
            <hr />
            <WhitelistBeatmapFilter />
        </div>
    );
}
