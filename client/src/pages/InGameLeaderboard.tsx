import Leaderboard from "../components/leaderboard/Leaderboard";
import { PPModes } from "../interfaces/PPModes";

export default function InGameLeaderboard() {
    return <Leaderboard mode={PPModes.inGame} />;
}
