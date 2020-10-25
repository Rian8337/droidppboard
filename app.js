const express = require('express');
const mongodb = require('mongodb');
const https = require('https');
const osudroid = require('osu-droid');
const fileupload = require('express-fileupload');
const bodyParser = require('body-parser');
require("dotenv").config();
const dbkey = process.env.DB_KEY;

const app = express();

app.set('view engine', 'pug');
app.use(fileupload({
    limits: {
      fileSize: 1000000 //1 MB
    },
    abortOnLimit: true
  }));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

const uri = 'mongodb://' + dbkey + '@elainadb-shard-00-00-r6qx3.mongodb.net:27017,elainadb-shard-00-01-r6qx3.mongodb.net:27017,elainadb-shard-00-02-r6qx3.mongodb.net:27017/test?ssl=true&replicaSet=ElainaDB-shard-0&authSource=admin&retryWrites=true';

/**
 * @type {mongodb.Collection}
 */
let maindb;
/**
 * @type {mongodb.Collection}
 */
let binddb;
/**
 * @type {mongodb.Collection}
 */
let whitelistdb;

const top_pp_list = [
    {
        modbits: -1,
        list: []
    }
];
const mapCache = new Map();
const clientdb = new mongodb.MongoClient(uri, {useNewUrlParser: true});

function convertURI(input) {
    input = decodeURIComponent(input);
    const arr = input.split("");
    for (const i in arr)
        if (i !== arr.length-1 && arr[i] === '+' && arr[parseInt(i)+1] !== '+') {
            arr[i] = ' ';
        }
    
    input = arr.join("");
    return input;
}

function convertURIregex(input) {
    input = decodeURIComponent(input);
    const arr = input.split("");
    for (const i in arr) {
        if (arr[i] == '*') {arr[i] = '[*]';}
        if (arr[i] == '?') {arr[i] = '[?]';}
        if (arr[i] == '$') {arr[i] = '[$]';}
        if (arr[i] == '(') {arr[i] = '[(]';}
        if (arr[i] == ')') {arr[i] = '[)]';}
        if (arr[i] == '[') {arr[i] = '[[]';}
        if (arr[i] == ']') {arr[i] = '[]]';}
        if (arr[i] == '"') {arr[i] = '["]';}
        if (arr[i] == "'") {arr[i] = "[']";}
        if (arr[i] == ":") {arr[i] = "[:]";}
        if (i != arr.length-1 && arr[i] == '+' && arr[parseInt(i)+1] != '+') {
            arr[i] = ' ';
        }
        if (arr[i] == "+") {
            arr[i] = "[+]";
        }
    }
    input = arr.join("");
    return input;
}

function refreshtopPP() {
    console.log("Refreshing top pp list");
    binddb.find({}, { projection: { _id: 0, username: 1, pp: 1}}).toArray(function(err, res) {
        top_pp_list.forEach(v => v.list.length === 0);
        res.forEach((val, index) => {
            const ppEntries = val.pp;
            for (const ppEntry of ppEntries) {
                const entry = {
                    username: val.username,
                    map: ppEntry.title + (ppEntry.mods ? " +" + ppEntry.mods : ""),
                    rawpp: ppEntry.pp,
                    combo: ppEntry.combo,
                    acc_percent: ppEntry.accuracy,
                    miss_c: ppEntry.miss
                };
                top_pp_list[0].list.push(entry);

                const modbits = osudroid.mods.modbitsFromString(ppEntry.mods);
                const index = top_pp_list.findIndex(v => v.modbits === modbits);
                if (index !== -1) {
                    top_pp_list[index].list.push(entry);
                } else {
                    top_pp_list.push({
                        modbits: modbits,
                        list: [entry]
                    });
                }
            }
            top_pp_list.forEach(v => {
                v.list.sort((a, b) => {return b.rawpp - a.rawpp;});
                if (v.list.length >= 100) {
                    v.list.splice(100);
                }
            });

            if (index == res.length - 1) {
                console.log("Done");
            }
        });
    });
}

function downloadBeatmap(beatmapID) {
    return new Promise(resolve => {
        let data = "";
        https.get(`https://osu.ppy.sh/osu/${beatmapID}`, res => {
            res.setEncoding("utf-8");
            res.on("data", chunk => {
                data += chunk;
            });
            res.on("end", () => {
                resolve(data);
            });
        });
    });
}

clientdb.connect(function(err, db) {
    if (err) throw err;
    maindb = db.db('ElainaDB');
    console.log("DB connection established");
    binddb = maindb.collection('userbind');
    whitelistdb = maindb.collection('mapwhitelist');
    refreshtopPP();
    setInterval(refreshtopPP, 1800000);
    
    app.get('/', (req, res) => {
        const page = parseInt(req.url.split('?page=')[1]) || 1;
        const searchQuery = req.url.split('?query=')[1] || "";
        const query = {};
        if (searchQuery) {
            const regexQuery = new RegExp(convertURIregex(searchQuery), "i");
            query.$or = [{uid: regexQuery}, {username: regexQuery}];
        }
        binddb.find(query, { projection: { _id: 0, discordid: 1, uid: 1, pptotal: 1 , playc: 1, username: 1}}).sort({ pptotal: -1 }).skip((page-1)*50).limit(50).toArray(function(err, resarr) {
            if (err) throw err;
            const entries = [];
            for (const i in resarr) {
                if (resarr[i].pptotal) {
                    resarr[i].pptotal = resarr[i].pptotal.toFixed(2);
                    entries.push(resarr[i]);
                }
            }
            res.render('main', {
                title: 'PP Leaderboard',
                list: entries,
                page: page,
                query: convertURI(searchQuery)
            });        
        });
    });

    app.get('/whitelist', (req, res) => {
        let page = parseInt(req.url.split('?page=')[1]);
        let query = req.url.split('?query=')[1] || "";
        let mapquery = {};
        if (!page) {
            page = 1;
        }
        if (query) {
            const regexquery = new RegExp(convertURIregex(query), 'i'); 
            mapquery = {mapname: regexquery};
        }
        whitelistdb.find(mapquery, {projection: {_id: 0}}).sort({ mapname: 1 }).skip((page-1)*30).limit(30).toArray(function(err, resarr) {
            res.render('whitelist', {
                title: 'Whitelisted Beatmaps List',
                list: resarr,
                page: page,
                query: convertURI(query)
            });
        });
    });

    app.get('/about', (req, res) => {
        res.render('about');
    });

    app.get('/toppp', (req, res) => {
        const mods = req.url.split("?mods=")[1] || "";
        const modbits = mods === "NM" ? 0 : osudroid.mods.modbitsFromString(mods) || -1;
        const modList = top_pp_list.find(v => v.modbits === modbits) || {list: []};
        res.render('toppp', {
            pplist: modList.list,
            mods: convertURI(req.url.split("?mods=")[1] || ""),
        });
    });

    app.get('/profile', (req, res) => {
        const uid = req.url.split('uid=')[1];
        if (isNaN(uid)) {
            return res.send("404 Page Not Found");
        }
        binddb.findOne({uid: uid}, function(err, findres){
            if (err) throw err;
            res.render('profile', {
                title: "Player Profile",
                username: findres.username,
                pptotal: findres.pptotal.toFixed(2),
                entries: findres.pp
            });
        });
    });

    app.get('/calculate', async (req, res) => {
        res.render('calculate');
    });

    app.post('/calculate', async (req, res) => {
        let osuFile = "";

        if (req.files) {
            const file = req.files.BeatmapFile;
            if (!file || !file.name.endsWith(".osu")) {
                return res.render('calculate', {
                    err: "Invalid file uploaded"
                });
            }
            osuFile = file.data.toString("utf-8");
        }

        if (req.body.MapID && !osuFile) {
            const a = req.body.MapID.split("/");
            const beatmapID = parseInt(a[a.length - 1]);
            if (beatmapID <= 0 || isNaN(beatmapID)) {
                return res.render('calculate', {
                    err: "Invalid beatmap ID"
                });
            }

            const cache = mapCache.get(beatmapID);
            if (cache) {
                osuFile = cache;
            } else {
                osuFile = await downloadBeatmap(beatmapID);
                if (!osuFile) {
                    return res.render('calculate', {
                        err: "Beatmap with specified beatmap ID is not available"
                    });
                }
                mapCache.set(beatmapID, osuFile);
            }
        }

        if (!osuFile) {
            return res.render('calculate', {
                err: "Beatmap ID not specified and no .osu file is uploaded"
            });
        }
        
        const mods = req.body.Mod || "";
        const acc = Math.max(0, Math.min(parseFloat(req.body.Accuracy), 100)) || 100;
        const combo = Math.max(0, parseInt(req.body.Combo)) || 0;
        const miss = Math.max(0, parseInt(req.body.Miss)) || 0;

        const stats = new osudroid.MapStats();
        if (req.body.SpeedMul) {
            stats.speedMultiplier = Math.max(0.5, Math.min(parseFloat(req.body.SpeedMul), 2));
        }
        if (req.body.ForceAR) {
            stats.isForceAR = true;
            stats.ar = Math.max(0, Math.min(parseFloat(req.body.ForceAR), 12.5));
        }

        const star = new osudroid.MapStars().calculate({file: osuFile, mods: mods, stats: stats});
        if (star.pcStars.total === 0) {
            return res.render('calculate', {
                err: "Invalid file uploaded"
            });
        }

        const dpp = new osudroid.PerformanceCalculator().calculate({
            stars: star.droidStars,
            combo: combo,
            accPercent: acc,
            miss: miss,
            mode: osudroid.modes.droid,
            stats: stats
        });

        const pp = new osudroid.PerformanceCalculator().calculate({
            stars: star.pcStars,
            combo: combo,
            accPercent: acc,
            miss: miss,
            mode: osudroid.modes.osu,
            stats: stats
        });

        const map = star.pcStars.map;
        const statsForString = new osudroid.MapStats({
            cs: map.cs,
            ar: stats.isForceAR ? stats.ar : map.ar,
            od: map.od,
            hp: map.hp,
            mods: mods,
            speedMultiplier: stats.speedMultiplier,
            isForceAR: stats.isForceAR
        }).calculate({mode: osudroid.modes.osu});

        let mapString = `${map.artist} - ${map.title} (${map.creator}) [${map.version}]${mods ? ` +${mods}` : ""}`;
        if (stats.speedMultiplier !== 1 || stats.isForceAR) {
            mapString += " (";
            if (stats.isForceAR) {
                mapString += `AR${stats.ar}`;
            }
            if (stats.speedMultiplier !== 1) {
                if (stats.isForceAR) {
                    mapString += ", ";
                }
                mapString += `${stats.speedMultiplier}x`;
            }
            mapString += ")";
        }

        res.render('calculate', {
            maptitle: mapString,
            objectstat: `Circles: ${map.circles} - Sliders: ${map.sliders} - Spinners: ${map.spinners}`,
            mapstat: `CS: ${map.cs}${statsForString.cs === map.cs ? "": ` (${statsForString.cs.toFixed(2)})`} - AR: ${map.ar}${statsForString.ar === map.ar ? "": ` (${statsForString.ar.toFixed(2)})`} - OD: ${map.od}${statsForString.od === map.od ? "" : ` (${statsForString.od.toFixed(2)})`} - HP: ${map.hp}${statsForString.hp === map.hp ? "": ` (${statsForString.hp.toFixed(2)})`}`,
            ppentry: [
                {
                    type: "Droid",
                    sr: star.droidStars.total.toFixed(2),
                    aimsr: star.droidStars.aim.toFixed(2),
                    speedsr: star.droidStars.speed.toFixed(2),
                    pp: dpp.total.toFixed(2),
                    aimpp: dpp.aim.toFixed(2),
                    speedpp: dpp.speed.toFixed(2),
                    accpp: dpp.accuracy.toFixed(2)
                },
                {
                    type: "PC",
                    sr: star.pcStars.total.toFixed(2),
                    aimsr: star.pcStars.aim.toFixed(2),
                    speedsr: star.pcStars.speed.toFixed(2),
                    pp: pp.total.toFixed(2),
                    aimpp: pp.aim.toFixed(2),
                    speedpp: pp.speed.toFixed(2),
                    accpp: pp.accuracy.toFixed(2)
                }
            ]
        });
    });
    
    const port = process.env.PORT || 5000;
    
    app.listen(port, () => {
        console.log(`Express running → PORT ${port}`);
    });
});