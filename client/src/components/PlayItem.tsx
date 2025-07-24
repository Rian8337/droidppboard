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
            <IndividualPPCell prevPP={data.prevAim} newPP={data.newAim} />
            <IndividualPPCell prevPP={data.prevTap} newPP={data.newTap} />
            <IndividualPPCell
                prevPP={data.prevAccuracy}
                newPP={data.newAccuracy}
            />
            <IndividualPPCell prevPP={data.prevVisual} newPP={data.newVisual} />
            <td>{(data.pp - data.prevPP).toFixed(2)}</td>
            <td>
                {ModUtil.modsToOrderedString(
                    ModUtil.deserializeMods(data.mods)
                )}
            </td>
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
