import MenuItem from "./MenuItem";
import "../../styles/menu.css";

export default function Menu() {
    return (
        <div className="main-menu">
            <nav>
                <MenuItem path="/" label="Home" />
                <MenuItem path="/leaderboard" label="Leaderboard" />
                <MenuItem path="/whitelist" label="Whitelist" />
                <MenuItem path="/top-plays" label="Top Plays" />
                <MenuItem path="/calculate" label="Calculate Beatmap PP" />
                <MenuItem
                    path="/prototype/leaderboard"
                    label="Prototype Leaderboard"
                />
                <MenuItem
                    path="/prototype/top-plays"
                    label="Prototype Top Plays"
                />
                <MenuItem
                    path="/prototype/calculate"
                    label="Calculate Beatmap Prototype PP"
                />
                <MenuItem path="/skin/list" label="Player Skins" />
            </nav>
        </div>
    );
}
