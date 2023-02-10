import MenuItem from "./MenuItem";
import "../styles/main.css";

export default function Menu() {
    return (
        <div className="main-menu">
            <nav>
                <ul>
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
                    <MenuItem
                        path="/old/leaderboard"
                        label="Old PP Leaderboard"
                    />
                    <MenuItem path="/old/top-plays" label="Old PP Top Plays" />
                    <MenuItem path="/skin/list" label="Player Skins" />
                </ul>
            </nav>
        </div>
    );
}
