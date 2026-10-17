import { useContext } from "react";
import PrototypeSelectorNavigator from "../hooks/PrototypeSelectorNavigator";
import { useLocation, useNavigate } from "react-router-dom";

export default function PrototypeSelector() {
    const prototypeSelectorCtx = useContext(PrototypeSelectorNavigator);
    const location = useLocation();
    const navigate = useNavigate();

    function changeVariant(event: React.ChangeEvent<HTMLSelectElement>) {
        // Redirect the user to the new variant if we are in a prototype page.
        if (
            location.pathname.includes("/prototype/") &&
            prototypeSelectorCtx.currentVariant
        ) {
            // The variant is always the last segment of a prototype page's path.
            const segments = location.pathname.replace(/\/+$/, "").split("/");

            segments[segments.length - 1] = encodeURIComponent(
                event.target.value
            );

            navigate(segments.join("/"));
        }
    }

    return (
        <div style={{ textAlign: "center" }}>
            <h4>Current Variant</h4>
            <select
                className="search"
                value={prototypeSelectorCtx.currentVariant?.name ?? "unknown"}
                onChange={changeVariant}
            >
                {prototypeSelectorCtx.variants.map((variant) => (
                    <option key={variant.name} value={variant.name}>
                        {variant.title ?? variant.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
