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

//#region App configuration

Util.initCanvas();

const app = express();
const ppboardRouter = express.Router();
const skinsRouter = express.Router();

app.set("trust proxy", 1);

app.use(cors());
app.use(formData.parse({ maxFilesSize: 1000000 }));
app.use(formData.format());
app.use(formData.stream());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(resolve(Util.getFrontendPath(), "build")));
app.use(Util.createRateLimit(12));

app.use("/api/ppboard", ppboardRouter);
app.use("/api/skins", skinsRouter);

//#endregion

//#region Droid PP endpoints

ppboardRouter.use(
    ["/getleaderboard", "/prototype/getleaderboard", "old/getleaderboard"],
    getPPLeaderboard
);
ppboardRouter.use(
    ["/getuserprofile", "/prototype/getuserprofile", "/old/getuserprofile"],
    getUserProfile
);
ppboardRouter.use("/getwhitelist", getWhitelist);
ppboardRouter.use(
    ["/gettopplays", "/prototype/gettopplays", "/old/gettopplays"],
    getTopPlays
);
ppboardRouter.use(
    ["/calculatebeatmap", "/prototype/calculatebeatmap"],
    calculateBeatmap
);

//#endregion

//#region Skins endpoints

skinsRouter.use("/search", searchSkins);
skinsRouter.use("/get", getSkin);

//#endregion

//#region App launch

app.get("*", (_, res) => {
    res.sendFile(resolve(Util.getFrontendPath(), "build", "index.html"));
});

// Connect to database, then open server
DatabaseManager.init().then(async () => {
    Util.refreshTopPP();
    Util.refreshPrototypeTopPP();

    const appPort = parseInt(process.env.PORT || "3001");

    app.listen(appPort, () => console.log(`Express running → PORT ${appPort}`));
});

//#endregion
