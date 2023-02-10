import Leaderboard from "../components/leaderboard/Leaderboard";
import { PPModes } from "../interfaces/PPModes";

export default function MainLeaderboard() {
    return <Leaderboard mode={PPModes.live} />;
}
