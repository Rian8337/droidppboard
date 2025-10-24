import { ICalculationResult } from "app-structures";
import "../../styles/table-calculation-result.css";

export default function PerformanceCalculationResult(props: {
    performance: ICalculationResult["performance"];
}) {
    const { performance } = props;

    return (
        <table className="calculation-result">
            <caption>Performance Statistics</caption>
            <tbody>
                <tr>
                    <th style={{ width: "10%" }}>Type</th>
                    <th style={{ width: "15%" }}>Aim</th>
                    <th style={{ width: "15%" }}>Speed/Tap</th>
                    <th style={{ width: "15%" }}>Accuracy</th>
                    <th style={{ width: "15%" }}>Flashlight</th>
                    <th style={{ width: "15%" }}>Reading</th>
                    <th style={{ width: "15%" }}>Total</th>
                </tr>
                <tr className="calc-data">
                    <th>Droid</th>
                    <td>{performance.droid.aim.toFixed(2)}</td>
                    <td>{performance.droid.speed.toFixed(2)}</td>
                    <td>{performance.droid.accuracy.toFixed(2)}</td>
                    <td>{performance.droid.flashlight.toFixed(2)}</td>
                    <td>{performance.droid.reading.toFixed(2)}</td>
                    <td>{performance.droid.total.toFixed(2)}</td>
                </tr>
                <tr className="calc-data">
                    <th>PC</th>
                    <td>{performance.osu.aim.toFixed(2)}</td>
                    <td>{performance.osu.speed.toFixed(2)}</td>
                    <td>{performance.osu.accuracy.toFixed(2)}</td>
                    <td>{performance.osu.flashlight.toFixed(2)}</td>
                    <td>0.00</td>
                    <td>{performance.osu.total.toFixed(2)}</td>
                </tr>
            </tbody>
        </table>
    );
}
