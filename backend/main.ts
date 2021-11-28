import { join } from "path";
import cors from "cors";
import express from "express";
import formData from "express-form-data";
import { config } from "dotenv";
import { MongoClient } from "mongodb";
import { DatabaseManager } from "app-database";
import getLeaderboard from "./routes/get-leaderboard";
import getUserProfile from "./routes/get-user-profile";
import getWhitelist from "./routes/get-whitelist";
import getTopPlays from "./routes/get-top-plays";
import calculateBeatmap from "./routes/calculate-beatmap";
import { Util } from "./Util";

config();

// Canvas configuration
Util.initCanvas();

// App configuration
const app: express.Express = express();

app.set("trust proxy", 1);

app.use(cors());
app.use(formData.parse({ maxFilesSize: 1000000 }));
app.use(formData.format());
app.use(formData.stream());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(Util.getFrontendPath(), "public")));
app.use(Util.createRateLimit(12));

app.use(["/api/getleaderboard", "/api/prototype/getleaderboard"], getLeaderboard);
app.use(["/api/getuserprofile", "/api/prototype/getuserprofile"], getUserProfile);
app.use("/api/getwhitelist", getWhitelist);
app.use(["/api/gettopplays", "/api/prototype/gettopplays"], getTopPlays);
app.use(["/api/calculatebeatmap", "/api/prototype/calculatebeatmap"], calculateBeatmap);

app.get("*", (_, res) => {
    res.sendFile(join(Util.getFrontendPath(), "build", "index.html"));
});

// Connect to database, then open server
const elainaDbKey: string = process.env.ELAINA_DB_KEY!;
const aliceDbKey: string = process.env.ALICE_DB_KEY!;

const elainaURI: string = 'mongodb://' + elainaDbKey + '@elainaDb-shard-00-00-r6qx3.mongodb.net:27017,elainaDb-shard-00-01-r6qx3.mongodb.net:27017,elainaDb-shard-00-02-r6qx3.mongodb.net:27017/test?ssl=true&replicaSet=ElainaDB-shard-0&authSource=admin&retryWrites=true';
const aliceURI: string = 'mongodb+srv://' + aliceDbKey + '@aliceDb-hoexz.gcp.mongodb.net/test?retryWrites=true&w=majority';

const elainaDb: MongoClient = new MongoClient(elainaURI);
const aliceDb: MongoClient = new MongoClient(aliceURI);

Promise.all([
    elainaDb.connect(),
    aliceDb.connect()
]).then(() => {
    DatabaseManager.init(
        elainaDb.db("ElainaDB"),
        aliceDb.db("AliceDB")
    );

    Util.refreshTopPP();
    Util.refreshPrototypeTopPP();

    const port: number = parseInt(process.env.PORT || "5000");

    app.listen(port, () => console.log(`Express running → PORT ${port}`));
});