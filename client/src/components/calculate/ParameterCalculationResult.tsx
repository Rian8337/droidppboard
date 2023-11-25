import { ICalculationParams, ICalculationResult } from "app-structures";
import "../../styles/table-calculation-result.css";
import { Util } from "../../Util";

export default function ParameterCalculationResult(props: {
    params: ICalculationParams;
    beatmap: ICalculationResult["beatmap"];
    estimated: boolean;
}) {
    const { beatmap, params } = props;

    return (
        <table className="calculation-result">
            <caption>Calculation Statistics</caption>
            <tbody>
                <tr>
                    <th>Mods</th>
                    <td>
                        {params.mods.length > 0 ? (
                            Util.parseMods(params.mods)?.map((m) => {
                                return (
                                    <img
                                        key={m}
                                        src={
                                            // eslint-disable-next-line @typescript-eslint/no-var-requires
                                            require("../../icons/mods/" +
                                                m +
                                                ".png")
                                        }
                                        alt={m}
                                        title={m}
                                    />
                                );
                            }) || (
                                <img
                                    key="NM"
                                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                                    src={require("../../icons/mods/NM.png")}
                                    alt="NM"
                                    title="NM"
                                />
                            )
                        ) : (
                            <img
                                key="NM"
                                // eslint-disable-next-line @typescript-eslint/no-var-requires
                                src={require("../../icons/mods/NM.png")}
                                alt="NM"
                                title="NoMod"
                            />
                        )}
                    </td>
                </tr>
                <tr>
                    <th>Accuracy</th>
                    <td>
                        {Math.max(
                            0,
                            Math.min(params.accuracy || 100, 100)
                        ).toFixed(2)}
                        %
                    </td>
                </tr>
                <tr>
                    <th>Combo</th>
                    <td>
                        {Math.max(
                            0,
                            Math.min(
                                params.combo || beatmap.maxCombo,
                                beatmap.maxCombo
                            )
                        )}
                        /{beatmap.maxCombo}
                    </td>
                </tr>
                <tr>
                    <th>Misses</th>
                    <td>{Math.max(0, params.misses || 0)}</td>
                </tr>
                <tr>
                    <th>Speed Multiplier</th>
                    <td>
                        {Math.max(
                            0.5,
                            Math.min(params.speedmultiplier || 1, 2)
                        )}
                    </td>
                </tr>
                <tr>
                    <th>Force CS</th>
                    <td>
                        {params.forcecs
                            ? `CS: ${Math.max(0, Math.min(params.forcecs, 11))}`
                            : "None"}
                    </td>
                </tr>
                <tr>
                    <th>Force AR</th>
                    <td>
                        {params.forcear
                            ? `AR: ${Math.max(
                                  0,
                                  Math.min(params.forcear, 12.5)
                              )}`
                            : "None"}
                    </td>
                </tr>
                <tr>
                    <th>Force OD</th>
                    <td>
                        {params.forceod
                            ? `OD: ${Math.max(0, Math.min(params.forceod, 11))}`
                            : "None"}
                    </td>
                </tr>
                <tr>
                    <th>Estimated</th>
                    <td>{props.estimated ? "Yes" : "No"}</td>
                </tr>
            </tbody>
        </table>
    );
}
