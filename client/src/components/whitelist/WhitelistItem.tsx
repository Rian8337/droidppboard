import { IMapWhitelist } from "app-structures";

export default function WhitelistItem(props: { data: IMapWhitelist }) {
    const whitelist = props.data;

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
