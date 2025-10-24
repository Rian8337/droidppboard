import { ICalculationResult } from "app-structures";
import "../../styles/table-calculation-result.css";

export default function DifficultyCalculationResult(props: {
    difficulty: ICalculationResult["difficulty"];
}) {
    const { difficulty } = props;

    return (
        <table className="calculation-result">
            <caption>Difficulty Statistics</caption>
            <tbody>
                <tr>
                    <th style={{ width: "10%" }}>Type</th>
                    <th style={{ width: "18%" }}>Aim</th>
                    <th style={{ width: "18%" }}>Speed/Tap</th>
                    <th style={{ width: "18%" }}>Rhythm</th>
                    <th style={{ width: "18%" }}>Flashlight</th>
                    <th style={{ width: "18%" }}>Reading</th>
                    <th style={{ width: "18%" }}>Total</th>
                </tr>
                <tr className="calc-data">
                    <th>Droid</th>
                    <td>{difficulty.droid.aim.toFixed(2)}</td>
                    <td>{difficulty.droid.speed.toFixed(2)}</td>
                    <td>{difficulty.droid.rhythm.toFixed(2)}</td>
                    <td>{difficulty.droid.flashlight.toFixed(2)}</td>
                    <td>{difficulty.droid.reading.toFixed(2)}</td>
                    <td>{difficulty.droid.total.toFixed(2)}</td>
                </tr>
                <tr className="calc-data">
                    <th>PC</th>
                    <td>{difficulty.osu.aim.toFixed(2)}</td>
                    <td>{difficulty.osu.speed.toFixed(2)}</td>
                    <td>0.00</td>
                    <td>{difficulty.osu.flashlight.toFixed(2)}</td>
                    <td>0.00</td>
                    <td>{difficulty.osu.total.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
    );
}
