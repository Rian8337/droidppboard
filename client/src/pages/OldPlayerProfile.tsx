import PlayerProfile from "../components/PlayerProfile";
import { PPModes } from "../interfaces/PPModes";

export default function OldPlayerProfile() {
    return <PlayerProfile mode={PPModes.old} />;
}
