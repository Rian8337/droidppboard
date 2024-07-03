import { useContext } from "react";
import PrototypeSelectorNavigator from "../hooks/PrototypeSelectorNavigator";
import { useLocation, useNavigate } from "react-router-dom";

export default function PrototypeSelector() {
    const prototypeSelectorCtx = useContext(PrototypeSelectorNavigator);
    const location = useLocation();
    const navigate = useNavigate();

    function changeRework(event: React.ChangeEvent<HTMLSelectElement>) {
        // Redirect the user to the new rework if we are in a prototype page.
        if (
            location.pathname.includes("/prototype/") &&
            prototypeSelectorCtx.currentRework
        ) {
            navigate(
                location.pathname.replace(
                    prototypeSelectorCtx.currentRework.type,
                    event.target.value
                )
            );
        }
    }

    return (
        <div style={{ textAlign: "center" }}>
            <h4>Current Rework</h4>
            <select
                className="search"
                value={prototypeSelectorCtx.currentRework?.type ?? "overall"}
                onChange={changeRework}
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
