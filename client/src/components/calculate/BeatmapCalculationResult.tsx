import { ICalculationResult } from "app-structures";

export default function BeatmapCalculationResult(props: {
    beatmap: ICalculationResult["beatmap"];
}) {
    const { beatmap } = props;

    return (
        <table className="calculation-result">
            <caption>Beatmap Statistics</caption>
            <tbody>
                {beatmap.id ? (
                    <tr>
                        <th>Beatmap ID</th>
                        <td>
                            <a
                                href={`https://osu.ppy.sh/b/${beatmap.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {beatmap.id} (click/tap to visit osu! site)
                            </a>
                        </td>
                    </tr>
                ) : null}
                <tr>
                    <th>Artist</th>
                    <td>{beatmap.artist}</td>
                </tr>
                <tr>
                    <th>Title</th>
                    <td>{beatmap.title}</td>
                </tr>
                <tr>
                    <th>Creator/Mapper</th>
                    <td>{beatmap.creator}</td>
                </tr>
                <tr>
                    <th>Difficulty Name</th>
                    <td>{beatmap.version}</td>
                </tr>
                <tr>
                    <th>Base Statistics</th>
                    <td>
                        CS: {beatmap.stats.cs} AR: {beatmap.stats.ar} OD:{" "}
                        {beatmap.stats.od} HP: {beatmap.stats.hp}
                    </td>
                </tr>
                <tr>
                    <th>Modified Statistics</th>
                    <td>
                        CS: {beatmap.modifiedStats.cs.toFixed(2)} AR:{" "}
                        {beatmap.modifiedStats.ar.toFixed(2)} OD:{" "}
                        {beatmap.modifiedStats.od.toFixed(2)} HP:{" "}
                        {beatmap.modifiedStats.hp.toFixed(2)}
                    </td>
                </tr>
            </tbody>
        </table>
    );
}
