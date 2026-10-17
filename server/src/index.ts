import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import formData from "express-form-data";
import getPPLeaderboard from "./routes/api/ppboard/get-leaderboard";
import getUserProfile from "./routes/api/ppboard/get-user-profile";
import getWhitelist from "./routes/api/ppboard/get-whitelist";
import getTopPlays from "./routes/api/ppboard/get-top-plays";
import calculateBeatmap from "./routes/api/ppboard/calculate-beatmap";
import getScoreMultiplierSample from "./routes/api/ppboard/score-multiplier-sample";
import login from "./routes/api/auth/login";
import logout from "./routes/api/auth/logout";
import me from "./routes/api/auth/me";
import searchSkins from "./routes/api/skins/search-skins";
import getSkin from "./routes/api/skins/get-skin";
import { config } from "dotenv";
import { resolve } from "path";
import { Util } from "./utils/Util";
import { bodyParserErrorHandler } from "./utils/bodyParserErrorHandler";
import { requireAllowedOrigin } from "./auth/originCheck";
import { sessionMiddleware } from "./auth/sessionMiddleware";
import { initSessions } from "./auth/sessions";
import { DatabaseManager } from "./database/managers/DatabaseManager";
import {
    DroidAPIRequestBuilder,
    OsuAPIRequestBuilder,
} from "@rian8337/osu-base";

config();

DroidAPIRequestBuilder.setAPIKey(process.env.DROID_API_KEY!);
OsuAPIRequestBuilder.setAPIKey(process.env.OSU_API_KEY!);

//#region App configuration

const app = express();
const ppboardRouter = express.Router();
const skinsRouter = express.Router();
const authRouter = express.Router();

// Allow local requests and the website to access the API
const allowedOrigins = [
    "https://droidpp.osudroid.moe",
    "http://localhost:3000",
];

app.set("trust proxy", 1);

app.use(
    cors({
        origin: allowedOrigins,
    }),
);

app.use(formData.parse({ maxFilesSize: 1000000 }));
app.use(formData.format());
app.use(formData.stream());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParserErrorHandler);
app.use(cookieParser());
app.use(express.static(resolve(Util.getFrontendPath(), "build")));
app.use(Util.createRateLimit(12));

app.use("/api/ppboard", ppboardRouter);
app.use("/api/skins", skinsRouter);
app.use("/api/auth", authRouter);

//#endregion

//#region Droid PP endpoints

ppboardRouter.use("/prototype/getleaderboard", getPPLeaderboard);
ppboardRouter.use("/prototype/getuserprofile", getUserProfile);
ppboardRouter.use("/getwhitelist", getWhitelist);
ppboardRouter.use("/prototype/gettopplays", getTopPlays);
ppboardRouter.use(
    ["/calculatebeatmap", "/prototype/calculatebeatmap"],
    calculateBeatmap,
);
ppboardRouter.use("/score-multiplier-sample", getScoreMultiplierSample);

//#endregion

//#region Auth endpoints

// Logging in is slow to brute force on purpose, so this is stricter than the global limit.
authRouter.use(Util.createRateLimit(10));
authRouter.use(requireAllowedOrigin(allowedOrigins));
authRouter.use(sessionMiddleware);

authRouter.use("/login", login);
authRouter.use("/logout", logout);
authRouter.use("/me", me);

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
    await initSessions();

    Util.refreshPrototypeTopPP();

    const appPort = parseInt(process.env.PORT || "3001");

    app.listen(appPort, () => console.log(`Express running → PORT ${appPort}`));
});

//#endregion
