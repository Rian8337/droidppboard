import express from "express";
import cors from "cors";
import formData from "express-form-data";
import getPPLeaderboard from "./routes/api/ppboard/get-leaderboard";
import getUserProfile from "./routes/api/ppboard/get-user-profile";
import getWhitelist from "./routes/api/ppboard/get-whitelist";
import getTopPlays from "./routes/api/ppboard/get-top-plays";
import calculateBeatmap from "./routes/api/ppboard/calculate-beatmap";
import searchSkins from "./routes/api/skins/search-skins";
import getSkin from "./routes/api/skins/get-skin";
import { config } from "dotenv";
import { resolve } from "path";
import { Util } from "./utils/Util";
import { DatabaseManager } from "./database/managers/DatabaseManager";

config();

// Canvas configuration
Util.initCanvas();

// App configuration
const app = express();

app.set("trust proxy", 1);

app.use(cors());
app.use(formData.parse({ maxFilesSize: 1000000 }));
app.use(formData.format());
app.use(formData.stream());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(resolve(Util.getFrontendPath(), "build")));
app.use(Util.createRateLimit(12));

app.use(
    [
        "/api/ppboard/getleaderboard",
        "/api/ppboard/prototype/getleaderboard",
        "/api/ppboard/old/getleaderboard",
    ],
    getPPLeaderboard
);
app.use(
    [
        "/api/ppboard/getuserprofile",
        "/api/ppboard/prototype/getuserprofile",
        "/api/ppboard/old/getuserprofile",
    ],
    getUserProfile
);
app.use("/api/ppboard/getwhitelist", getWhitelist);
app.use(
    [
        "/api/ppboard/gettopplays",
        "/api/ppboard/prototype/gettopplays",
        "/api/ppboard/old/gettopplays",
    ],
    getTopPlays
);
app.use(
    [
        "/api/ppboard/calculatebeatmap",
        "/api/ppboard/prototype/calculatebeatmap",
    ],
    calculateBeatmap
);
app.use("/api/skins/search", searchSkins);
app.use("/api/skins/get", getSkin);

app.get("*", (_, res) => {
    res.sendFile(resolve(Util.getFrontendPath(), "build", "index.html"));
});

// Connect to database, then open server
DatabaseManager.init().then(async () => {
    Util.refreshTopPP();
    Util.refreshPrototypeTopPP();
    Util.refreshOldTopPP();

    const appPort = parseInt(process.env.PORT || "3001");

    app.listen(appPort, () => console.log(`Express running → PORT ${appPort}`));
});
