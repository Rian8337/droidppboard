import { PrototypePPEntry, TopPrototypePPEntry } from "app-structures";
import "../styles/play-list.css";
import { ModUtil } from "@rian8337/osu-base";

const isTopEntry = (
    data: PrototypePPEntry | TopPrototypePPEntry
): data is TopPrototypePPEntry => {
    return (data as TopPrototypePPEntry).username !== undefined;
};

function IndividualPPCell(props: { prevPP: number; newPP: number }) {
    const { prevPP, newPP } = props;

    return (
        <td>
            {newPP.toFixed(2)}
            <br />
            <span style={{ fontSize: "0.65em" }}>
                ({(newPP - prevPP).toFixed(2)})
            </span>
        </td>
    );
}

export default function PlayItem(props: {
    data: (PrototypePPEntry | TopPrototypePPEntry) & { rank: number };
    index: number;
    onClick?: React.MouseEventHandler<HTMLTableRowElement>;
}) {
    const { data, onClick } = props;
    const topEntry = isTopEntry(data);

    return (
        <tr className="play-item" onClick={onClick}>
            <td>{data.rank}</td>

            {topEntry && <td style={{ textAlign: "left" }}>{data.username}</td>}

            <td style={{ textAlign: "left" }}>{data.title}</td>
            <td>{data.live.performance.total.toFixed(2)}</td>
            {data.master && <td>{data.master.performance.total.toFixed(2)}</td>}
            <td>{data.local.performance.total.toFixed(2)}</td>
            <td>
                {(
                    data.local.performance.total -
                    (data.master ?? data.live).performance.total
                ).toFixed(2)}
            </td>
            <IndividualPPCell
                prevPP={(data.master ?? data.live).performance.aim}
                newPP={data.local.performance.aim}
            />
            <IndividualPPCell
                prevPP={(data.master ?? data.live).performance.tap}
                newPP={data.local.performance.tap}
            />
            <IndividualPPCell
                prevPP={(data.master ?? data.live).performance.accuracy}
                newPP={data.local.performance.accuracy}
            />
            <IndividualPPCell
                prevPP={(data.master ?? data.live).performance.reading}
                newPP={data.local.performance.reading}
            />
            <td>
                {ModUtil.modsToOrderedString(
                    ModUtil.deserializeMods(data.mods)
                )}
            </td>
            <td>{data.accuracy.toFixed(2)}</td>
            <td>{data.combo}</td>

            {topEntry ? (
                <td>
                    {data.hit100}/{data.hit50}/{data.miss}
                </td>
            ) : (
                <>
                    <td>{data.hit100}</td>
                    <td>{data.hit50}</td>
                    <td>{data.miss}</td>
                </>
            )}
        </tr>
    );
}
