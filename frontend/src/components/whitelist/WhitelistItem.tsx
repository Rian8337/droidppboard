import { MapWhitelist } from "app-database";

export default function WhitelistItem(props: { data: MapWhitelist }) {
    const whitelist: MapWhitelist = props.data;

    return (
        <tr>
            <td>
                <a
                    href={`https://osu.ppy.sh/b/${whitelist.mapid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {whitelist.mapname}
                </a>
            </td>
            <td>{whitelist.diffstat.cs}</td>
            <td>{whitelist.diffstat.ar}</td>
            <td>{whitelist.diffstat.od}</td>
            <td>{whitelist.diffstat.hp}</td>
            <td>{whitelist.diffstat.sr}</td>
            <td>{whitelist.diffstat.bpm}</td>
        </tr>
    );
}
