import { IPlayerSkin } from "app-structures";
import { useContext, useEffect } from "react";
import SkinListNavigator from "../../hooks/SkinListNavigator";
import SkinItem from "./SkinItem";

export default function SkinTable() {
    const ctx = useContext(SkinListNavigator);

    useEffect(() => {
        ctx.setEnablePaging(false);
        ctx.setSearchReady(false);

        fetch(
            `/api/skins/search?page=${ctx.internalPage}${
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
            .then((rawData: IPlayerSkin[]) => {
                ctx.setData(rawData);
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
                    ? "No skins found!"
                    : "Loading skins..."}
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
                    <th
                        style={{
                            width: "20%",
                        }}
                    >
                        Name
                    </th>
                    <th style={{ width: "75%" }}>Description</th>
                </tr>
            </thead>
            <tbody>
                {ctx.data.map((v, i) => {
                    return (
                        <SkinItem
                            key={`${v.discordid}:${v.name}:${
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
