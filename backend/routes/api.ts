import express from "express";
import rateLimit from "express-rate-limit";
import calculateBeatmap from "./api/calculate-beatmap";
import getUserProfile from "./api/get-user-profile";
import getLeaderboard from "./api/get-leaderboard";
import getTopPlays from "./api/get-top-plays";
import getWhitelist from "./api/get-whitelist";

const router: express.Router = express.Router();

router.use(rateLimit({
    windowMs: 1000,
    max: 2,
}));

router.use(["/calculatebeatmap", "/prototype/calculatebeatmap"], calculateBeatmap);
router.use(["/getuserprofile", "/prototype/getuserprofile"], getUserProfile);
router.use(["/getleaderboard", "/prototype/getleaderboard"], getLeaderboard);
router.use(["/gettopplays", "/prototype/gettopplays"], getTopPlays);
router.use("/getwhitelist", getWhitelist);

export default router;
