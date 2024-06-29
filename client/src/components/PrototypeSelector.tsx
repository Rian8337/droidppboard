import { useContext } from "react";
import PrototypeSelectorNavigator from "../hooks/PrototypeSelectorNavigator";

export default function PrototypeSelector() {
    const prototypeSelectorCtx = useContext(PrototypeSelectorNavigator);

    return (
        <div style={{ textAlign: "center" }}>
            <h4>Current Rework</h4>
            <select
                className="search"
                defaultValue={
                    prototypeSelectorCtx.currentRework?.type ?? "overall"
                }
                onChange={(event) => {
                    prototypeSelectorCtx.setCurrentRework(
                        prototypeSelectorCtx.reworks.find(
                            (rework) => rework.type === event.target.value
                        )
                    );
                }}
            >
                {prototypeSelectorCtx.reworks.map((rework) => (
                    <option key={rework.type} value={rework.type}>
                        {rework.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
