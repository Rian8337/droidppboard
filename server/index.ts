import express from "express";
import cors from "cors";
import formData from "express-form-data";
import getLeaderboard from "./routes/get-leaderboard";
import getUserProfile from "./routes/get-user-profile";
import getWhitelist from "./routes/get-whitelist";
import getTopPlays from "./routes/get-top-plays";
import calculateBeatmap from "./routes/calculate-beatmap";
import { config } from "dotenv";
import { resolve } from "path";
import { Util } from "./Util";
import { MongoClient } from "mongodb";
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
    ["/api/getleaderboard", "/api/prototype/getleaderboard"],
    getLeaderboard
);
app.use(
    ["/api/getuserprofile", "/api/prototype/getuserprofile"],
    getUserProfile
);
app.use("/api/getwhitelist", getWhitelist);
app.use(["/api/gettopplays", "/api/prototype/gettopplays"], getTopPlays);
app.use(
    ["/api/calculatebeatmap", "/api/prototype/calculatebeatmap"],
    calculateBeatmap
);

app.get("*", (_, res) => {
    res.sendFile(resolve(Util.getFrontendPath(), "build", "index.html"));
});

// Connect to database, then open server
const elainaDbKey = process.env.ELAINA_DB_KEY!;
const aliceDbKey = process.env.ALICE_DB_KEY!;

const elainaURI =
    "mongodb://" +
    elainaDbKey +
    "@elainaDb-shard-00-00-r6qx3.mongodb.net:27017,elainaDb-shard-00-01-r6qx3.mongodb.net:27017,elainaDb-shard-00-02-r6qx3.mongodb.net:27017/test?ssl=true&replicaSet=ElainaDB-shard-0&authSource=admin&retryWrites=true";
const aliceURI =
    "mongodb+srv://" +
    aliceDbKey +
    "@aliceDb-hoexz.gcp.mongodb.net/test?retryWrites=true&w=majority";

const elainaDb = new MongoClient(elainaURI);
const aliceDb = new MongoClient(aliceURI);

Promise.all([elainaDb.connect(), aliceDb.connect()]).then(() => {
    DatabaseManager.init(elainaDb.db("ElainaDB"), aliceDb.db("AliceDB"));

    Util.refreshTopPP();
    Util.refreshPrototypeTopPP();

    const port = parseInt(process.env.PORT || "3001");

    app.listen(port, () => console.log(`Express running → PORT ${port}`));
});
