import { PrototypePPEntry, TopPrototypePPEntry } from "app-structures";
import "../styles/play-list.css";

const isTopEntry = (
    data: PrototypePPEntry | TopPrototypePPEntry
): data is TopPrototypePPEntry => {
    return (data as TopPrototypePPEntry).username !== undefined;
};

export default function PlayItem(props: {
    data: (PrototypePPEntry | TopPrototypePPEntry) & { rank: number };
    index: number;
}) {
    const { data } = props;
    const topEntry = isTopEntry(data);

    return (
        <tr className="play-item">
            <td>{data.rank}</td>

            {topEntry && <td style={{ textAlign: "left" }}>{data.username}</td>}

            <td style={{ textAlign: "left" }}>{data.title}</td>
            <td>{data.prevPP.toFixed(2)}</td>
            <td>{data.pp.toFixed(2)}</td>
            <td>{(data.pp - data.prevPP).toFixed(2)}</td>
            <td>{data.mods.map((m) => m.acronym).join("")}</td>
            <td>{data.speedMultiplier ?? 1}</td>
            <td>{data.accuracy}</td>
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
