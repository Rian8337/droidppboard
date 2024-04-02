import PlayerProfile from "../components/PlayerProfile";
import { PPModes } from "../interfaces/PPModes";

export default function InGamePlayerProfile() {
    return <PlayerProfile mode={PPModes.inGame} />;
}
