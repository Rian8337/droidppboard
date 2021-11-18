import express from "express";
import fileupload from "express-fileupload";
import { registerFont } from "canvas";
import { join } from "path";
import { config } from "dotenv";
import { Util } from "./backend/utils/Util";
import { MongoClient } from "mongodb";
import { DatabaseManager } from "./backend/database/DatabaseManager";
import leaderboard from "./backend/routes/leaderboard";
import profile from "./backend/routes/profile";
import whitelist from "./backend/routes/whitelist";
import topPlays from "./backend/routes/top-plays";
import calculate from "./backend/routes/calculate";
import prototype from "./backend/routes/prototype";
import api from "./backend/routes/api";

config();

// App config
const app: express.Express = express();

app.set("view engine", "pug");
app.use(fileupload({
    limits: {
        fileSize: 1000000 // 1 MB
    },
    abortOnLimit: true
}));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(Util.getFrontendPath()));

app.use("/leaderboard", leaderboard);
app.use("/profile", profile);
app.use("/whitelist", whitelist);
app.use("/top-plays", topPlays);
app.use("/calculate", calculate);
app.use("/prototype", prototype);
app.use("/api", api);

app.get("/", (_, res) => {
    res.render(join(Util.getFrontendPath(), "render", "main"));
});

// Canvas config
Util.initCanvas();

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

    const port = process.env.PORT || 5000;

    app.listen(port, () => console.log(`Express running → PORT ${port}`));
});