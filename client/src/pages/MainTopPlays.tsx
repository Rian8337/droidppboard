import TopPlays from "../components/TopPlays";
import { PPModes } from "../interfaces/PPModes";

export default function MainTopPlays() {
    return <TopPlays mode={PPModes.live} />;
}
