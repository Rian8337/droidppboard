import PlayerProfile from "../components/PlayerProfile";
import { PPModes } from "../interfaces/PPModes";

export default function PrototypePlayerProfile() {
    return <PlayerProfile mode={PPModes.prototype} />;
}
