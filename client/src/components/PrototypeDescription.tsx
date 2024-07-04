import { useContext } from "react";
import "../styles/main.css";
import PrototypeSelectorNavigator from "../hooks/PrototypeSelectorNavigator";

export default function PrototypeDescription() {
    const prototypeSelectorCtx = useContext(PrototypeSelectorNavigator);

    if (!prototypeSelectorCtx.currentRework?.description) {
        return null;
    }

    return (
        <div className="prototype-description">
            {prototypeSelectorCtx.currentRework.description
                .split("\n")
                .map((v, i) => (
                    <p key={`prototype-description-${i}`}>{v}</p>
                ))}
        </div>
    );
}
