import TopPlays from "../components/TopPlays";
import { PPModes } from "../interfaces/PPModes";

export default function InGameTopPlays() {
    return <TopPlays mode={PPModes.inGame} />;
}
