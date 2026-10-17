import MenuItem from "./MenuItem";
import "../../styles/menu.css";
import { useContext } from "react";
import PrototypeSelectorNavigator from "../../hooks/PrototypeSelectorNavigator";

export default function Menu() {
    const prototypeSelectorCtx = useContext(PrototypeSelectorNavigator);
    const variantName =
        prototypeSelectorCtx.currentVariant?.name ?? "droid-rebalance";

    return (
        <div className="main-menu">
            <nav>
                <MenuItem path="/" label="Home" />
                <MenuItem path="/whitelist" label="Whitelist" />
                <MenuItem path="/calculate" label="Calculate Beatmap PP" />
                <MenuItem
                    path={`/prototype/leaderboard/${variantName}`}
                    label="Prototype Leaderboard"
                />
                <MenuItem
                    path={`/prototype/top-plays/${variantName}`}
                    label="Prototype Top Plays"
                />
                <MenuItem
                    path="/prototype/calculate"
                    label="Calculate Beatmap Prototype PP"
                />
                <MenuItem
                    path="/score-multiplier"
                    label="Score Multiplier Sample"
                />
            </nav>
        </div>
    );
}
