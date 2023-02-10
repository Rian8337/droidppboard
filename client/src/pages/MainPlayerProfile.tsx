import PlayerProfile from "../components/PlayerProfile";
import { PPModes } from "../interfaces/PPModes";

export default function MainPlayerProfile() {
    return <PlayerProfile mode={PPModes.live} />;
}
