import MenuItem from "./MenuItem";
import "../../styles/menu.css";
import { useContext } from "react";
import PrototypeSelectorNavigator from "../../hooks/PrototypeSelectorNavigator";

export default function Menu() {
    const prototypeSelectorCtx = useContext(PrototypeSelectorNavigator);
    const reworkType = prototypeSelectorCtx.currentRework?.type ?? "overall";

    return (
        <div className="main-menu">
            <nav>
                <MenuItem path="/" label="Home" />
                <MenuItem path="/leaderboard" label="Leaderboard" />
                <MenuItem path="/whitelist" label="Whitelist" />
                <MenuItem path="/top-plays" label="Top Plays" />
                <MenuItem path="/calculate" label="Calculate Beatmap PP" />
                <MenuItem
                    path={`/prototype/leaderboard/${reworkType}`}
                    label="Prototype Leaderboard"
                />
                <MenuItem
                    path={`/prototype/top-plays/${reworkType}`}
                    label="Prototype Top Plays"
                />
                <MenuItem
                    path="/prototype/calculate"
                    label="Calculate Beatmap Prototype PP"
                />
                <MenuItem
                    path="/ingame/leaderboard"
                    label="In-Game Leaderboard"
                />
                <MenuItem path="/ingame/top-plays" label="In-Game Top Plays" />
                <MenuItem path="/skin/list" label="Player Skins" />
            </nav>
        </div>
    );
}
