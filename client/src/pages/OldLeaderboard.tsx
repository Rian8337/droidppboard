import Leaderboard from "../components/leaderboard/Leaderboard";
import { PPModes } from "../interfaces/PPModes";

export default function OldLeaderboard() {
    return <Leaderboard mode={PPModes.old} />;
}
