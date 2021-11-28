import { CalculationParams, CalculationResult } from "app-structures";
import { MathUtils, Mod, ModUtil } from "osu-droid";

export default function ParameterCalculationResult(props: {
    params: CalculationParams;
    beatmap: CalculationResult["beatmap"];
    estimated: boolean;
}) {
    const { beatmap, params } = props;

    const displayMods: Mod[] = ModUtil.pcStringToMods(params.mods);

    return (
        <table className="calculation-result">
            <caption>Calculation Statistics</caption>
            <tbody>
                <tr>
                    <th>Mods</th>
                    <td>
                        {displayMods.length > 0 ? (
                            displayMods.map((m) => {
                                return (
                                    <img
                                        key={m.acronym}
                                        src={
                                            // eslint-disable-next-line @typescript-eslint/no-var-requires
                                            require("../../icons/mods/" +
                                                m.acronym +
                                                ".png").default
                                        }
                                        alt={m.acronym}
                                        title={m.name}
                                    />
                                );
                            })
                        ) : (
                            <img
                                key="NM"
                                // eslint-disable-next-line @typescript-eslint/no-var-requires
                                src={require("../../icons/mods/NM.png").default}
                                alt="NM"
                                title="NoMod"
                            />
                        )}
                    </td>
                </tr>
                <tr>
                    <th>Accuracy</th>
                    <td>
                        {MathUtils.clamp(
                            params.accuracy || 100,
                            0,
                            100
                        ).toFixed(2)}
                        %
                    </td>
                </tr>
                <tr>
                    <th>Combo</th>
                    <td>
                        {MathUtils.clamp(
                            params.combo || beatmap.maxCombo,
                            0,
                            beatmap.maxCombo
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
                        {MathUtils.clamp(params.speedmultiplier || 1, 0.5, 2)}
                    </td>
                </tr>
                <tr>
                    <th>Force AR</th>
                    <td>
                        {params.forcear
                            ? `AR: ${MathUtils.clamp(params.forcear, 0, 12.5)}`
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
