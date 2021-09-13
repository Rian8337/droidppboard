import * as express from 'express';
import * as mongodb from 'mongodb';
import * as fileupload from 'express-fileupload';
import * as bodyParser from 'body-parser';
import { config } from 'dotenv';
import { mods } from './modules/utils/mods';
import { MapStats } from './modules/utils/MapStats';
import { MapStars } from './modules/tools/MapStars';
import { modes } from './modules/constants/modes';
import { Beatmap } from './modules/beatmap/Beatmap';
import { BindDatabaseResponse } from './interfaces/BindDatabaseResponse';
import { DatabasePPEntry } from './interfaces/DatabasePPEntry';
import { PPList } from './interfaces/PPList';
import { WhitelistDatabaseResponse } from './interfaces/WhitelistDatabaseResponse';
import { convertURIregex, convertURI, Comparison, getComparisonText, getComparisonObject, downloadBeatmap, refreshtopPP, refreshPrototypeTopPP } from './util';
import { PrototypePPList } from './interfaces/PrototypePPList';
import { PrototypeDatabaseResponse } from './interfaces/PrototypeDatabaseResponse';
// import { RebalanceMapStars } from './modules/tools/RebalanceMapStars';
import { DroidPerformanceCalculator } from './modules/difficulty/DroidPerformanceCalculator';
import { OsuPerformanceCalculator } from './modules/difficulty/OsuPerformanceCalculator';
// import { Precision } from './modules/utils/Precision';
// import { Accuracy } from './modules/utils/Accuracy';
config();
// @ts-ignore
process.env.UV_THREADPOOL_SIZE = 128;

const elainadbkey: string = process.env.ELAINA_DB_KEY as string;
const alicedbkey: string = process.env.ALICE_DB_KEY as string;

const app: express.Express = express();

app.set('view engine', 'pug');
app.use(fileupload({
    limits: {
        fileSize: 1000000 // 1 MB
    },
    abortOnLimit: true
}));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

const mainURI: string = 'mongodb://' + elainadbkey + '@elainaDb-shard-00-00-r6qx3.mongodb.net:27017,elainaDb-shard-00-01-r6qx3.mongodb.net:27017,elainaDb-shard-00-02-r6qx3.mongodb.net:27017/test?ssl=true&replicaSet=ElainaDB-shard-0&authSource=admin&retryWrites=true';
const aliceURI: string = 'mongodb+srv://' + alicedbkey + '@aliceDb-hoexz.gcp.mongodb.net/test?retryWrites=true&w=majority';

let binddb: mongodb.Collection;
let whitelistdb: mongodb.Collection;
let keydb: mongodb.Collection;
let prototypedb: mongodb.Collection;

const top_pp_list: PPList[] = [];
const prototype_pp_list: PrototypePPList[] = [];
const elainaDb: mongodb.MongoClient = new mongodb.MongoClient(mainURI, {useNewUrlParser: true, useUnifiedTopology: true});
const aliceDb: mongodb.MongoClient = new mongodb.MongoClient(aliceURI, {useNewUrlParser: true, useUnifiedTopology: true});

elainaDb.connect((err, db) => {
    if (err) throw err;
    const maindb: mongodb.Db = db.db('ElainaDB');
    console.log("Elaina DB connection established");
    binddb = maindb.collection('userbind');
    whitelistdb = maindb.collection('mapwhitelist');
    
    if (binddb && whitelistdb && keydb && prototypedb) {
        initializeSite();
    }
});

aliceDb.connect((err, db) => {
    if (err) throw err;
    const maindb: mongodb.Db = db.db("AliceDB");
    console.log("Alice DB connection established");
    keydb = maindb.collection("ppapikey");
    prototypedb = maindb.collection("prototypepp");

    if (binddb && whitelistdb && keydb && prototypedb) {
        initializeSite();
    }
});

function initializeSite(): void {
    refreshtopPP(binddb, top_pp_list);
    refreshPrototypeTopPP(prototypedb, prototype_pp_list);

    app.get('/', (req, res) => {
        const page: number = parseInt(req.url.split('?page=')[1]) || 1;
        const searchQuery: string = req.url.split('?query=')[1] || "";
        const query = searchQuery ?
            {$or: [{uid: parseInt(searchQuery)}, {username: new RegExp(convertURIregex(searchQuery), "i")}]} :
            {};

        binddb.find(query, { projection: { _id: 0, discordid: 1, uid: 1, pptotal: 1 , playc: 1, username: 1}}).sort({ pptotal: -1 }).skip((page-1)*50).limit(50).toArray(function(err, resarr: BindDatabaseResponse[]) {
            if (err) throw err;
            const entries: BindDatabaseResponse[] = [];
            for (let i = 0; i < resarr.length; ++i) {
                if (resarr[i].pptotal) {
                    resarr[i].pptotal = parseFloat(resarr[i].pptotal.toFixed(2));
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

    app.get("/prototype", (req, res) => {
        const page: number = parseInt(req.url.split('?page=')[1]) || 1;
        const searchQuery: string = req.url.split('?query=')[1] || "";
        const query = searchQuery ?
            {$or: [{uid: parseInt(searchQuery)}, {username: new RegExp(convertURIregex(searchQuery), "i")}]} :
            {};

        prototypedb.find(query, { projection: { _id: 0, uid: 1, pptotal: 1, prevpptotal: 1, username: 1 } }).sort({ pptotal: -1 }).skip((page-1)*50).limit(50).toArray(function(err, resarr: PrototypeDatabaseResponse[]) {
            if (err) throw err;

            const entries = [];
            for (let i = 0; i < resarr.length; ++i) {
                if (resarr[i].pptotal) {
                    resarr[i].pptotal = parseFloat(resarr[i].pptotal.toFixed(2));
                    resarr[i].prevpptotal = parseFloat(resarr[i].prevpptotal.toFixed(2));
                    entries.push(resarr[i]);
                }
            }

            res.render("prototype", {
                title: 'Prototype PP',
                list: entries,
                page: page,
                query: convertURI(searchQuery)
            });
        });
    });

    app.get('/whitelist', (req, res) => {
        const page: number = parseInt(req.url.split('?page=')[1]) || 1;
        const query: string = convertURI(req.url.split('?query=')[1] || "").toLowerCase();
        const mapquery: object = {};
        const sort: object = {};
        if (query) {
            let mapNameQuery: string = "";
            const comparisonRegex: RegExp = /[<=>]{1,2}/;
            const finalQueries = query.split(/\s+/g);
            for (const finalQuery of finalQueries) {
                let [key, value]: string[] = finalQuery.split(comparisonRegex, 2);
                const comparison: Comparison = (comparisonRegex.exec(finalQuery) ?? ["="])[0] as Comparison;
                switch (key) {
                    case "cs":
                    case "ar":
                    case "od":
                    case "hp":
                    case "sr":
                    case "bpm":
                        const propertyName: string = `diffstat.${key}`;
                        if (mapquery.hasOwnProperty(propertyName)) {
                            Object.defineProperty(mapquery[propertyName as keyof typeof mapquery], getComparisonText(comparison), {value: parseFloat(value), writable: true, configurable: true, enumerable: true});
                        } else {
                            Object.defineProperty(mapquery, `diffstat.${key}`, {value: getComparisonObject(comparison, parseFloat(value)), writable: true, configurable: true, enumerable: true});
                        }
                        break;
                    case "star":
                    case "stars":
                        if (mapquery.hasOwnProperty("diffstat.sr")) {
                            Object.defineProperty(mapquery["diffstat.sr" as keyof typeof mapquery], getComparisonText(comparison), {value: parseFloat(value), writable: true, configurable: true, enumerable: true});
                        } else {
                            Object.defineProperty(mapquery, "diffstat.sr", {value: getComparisonObject(comparison, parseFloat(value)), writable: true, configurable: true, enumerable: true});
                        }
                        break;
                    case "sort":
                        const isDescendSort: boolean = value.startsWith("-");
                        if (isDescendSort) {
                            value = value.substring(1);
                        }
                        switch (value) {
                            case "beatmapid":
                            case "mapid":
                            case "id":
                                Object.defineProperty(sort, "mapid", {value: isDescendSort ? -1 : 1, writable: true, configurable: true, enumerable: true});
                                break;
                            case "beatmapname":
                            case "mapname":
                            case "name":
                                Object.defineProperty(sort, "mapname", {value: isDescendSort ? -1 : 1, writable: true, configurable: true, enumerable: true});
                                break;
                            case "cs":
                            case "ar":
                            case "od":
                            case "hp":
                            case "bpm":
                                Object.defineProperty(sort, `diffstat.${value}`, {value: isDescendSort ? -1 : 1, writable: true, configurable: true, enumerable: true});
                                break;
                            case "sr":
                            case "star":
                            case "stars":
                                Object.defineProperty(sort, "diffstat.sr", {value: isDescendSort ? -1 : 1, writable: true, configurable: true, enumerable: true});
                                break;
                            default:
                                mapNameQuery += finalQuery + " ";
                        }
                        break;
                    default:
                        mapNameQuery += finalQuery + " ";
                }
            }
            if (mapNameQuery) {
                const regexQuery: RegExp[] = mapNameQuery.trim().split(/\s+/g).map(v => {return new RegExp(convertURIregex(v), "i");});
                Object.defineProperty(mapquery, "$and", {value: regexQuery.map(v => {return {mapname: v};}), writable: false, configurable: true, enumerable: true});
            }
        }
        if (!sort.hasOwnProperty("mapname")) {
            Object.defineProperty(sort, "mapname", {value: 1, writable: true, configurable: true, enumerable: true});
        }
        // Allow SR and BPM sort to override beatmap title sort
        if (sort.hasOwnProperty("diffstat.sr") || sort.hasOwnProperty("diffstat.bpm")) {
            delete sort["mapname" as keyof typeof sort];
        }
        whitelistdb.find(mapquery, {projection: {_id: 0, mapid: 1, mapname: 1, diffstat: 1}}).sort(sort).skip((page-1)*30).limit(30).toArray(function(err, resarr: WhitelistDatabaseResponse[]) {
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
        const mod: string = req.url.split("?mods=")[1] || "";
        const droidMod: string = mod.toLowerCase() !== "nm" ? mods.pcToDroid(mod) || "" : "-";
        const modList = top_pp_list.find(v => v.mods === droidMod) || {list: []};
        res.render('toppp', {
            pplist: modList.list,
            mods: convertURI(mod).toUpperCase(),
        });
    });

    app.get('/prototypetoppp', (req, res) => {
        const mod: string = req.url.split("?mods=")[1] || "";
        const droidMod: string = mod.toLowerCase() !== "nm" ? mods.pcToDroid(mod) || "" : "-";
        const modList = prototype_pp_list.find(v => v.mods === droidMod) || {list: []};
        res.render('prototypetoppp', {
            pplist: modList.list,
            mods: convertURI(mod).toUpperCase(),
        });
    });

    app.get('/profile', (req, res) => {
        const uid: number = parseInt(req.url.split('uid=')[1]);
        if (isNaN(uid)) {
            return res.send("404 Page Not Found");
        }
        binddb.findOne({previous_bind: {$all: [uid]}}, function(err, findres: BindDatabaseResponse) {
            if (err) throw err;
            if (!findres) {
                return res.send("404 Page Not Found");
            }
            res.render('profile', {
                title: "Player Profile",
                username: findres.username,
                pptotal: findres.pptotal.toFixed(2),
                entries: findres.pp
            });
        });
    });

    app.get("/prototype/profile", (req, res) => {
        const uid: number = parseInt(req.url.split('uid=')[1]);
        if (isNaN(uid)) {
            return res.send("404 Page Not Found");
        }
        prototypedb.findOne({uid: uid}, function(err, prototype: PrototypeDatabaseResponse) {
            if (err) throw err;
            if (!prototype) {
                return res.send("404 Page Not Found");
            }
            res.render('prototypeProfile', {
                title: "Player Profile",
                username: prototype.username,
                prevpptotal: prototype.prevpptotal.toFixed(2),
                pptotal: prototype.pptotal.toFixed(2),
                difference: (prototype.pptotal - prototype.prevpptotal).toFixed(2),
                entries: prototype.pp,
                lastUpdate: new Date(prototype.lastUpdate).toUTCString()
            });
        });
    });

    app.get('/calculate', (req, res) => {
        res.render('calculate');
    });

    app.post('/calculate', async (req, res) => {
        let osuFile: string = "";

        if (req.files) {
            const file: fileupload.UploadedFile|undefined = req.files.BeatmapFile;
            if (!file || !file.name.endsWith(".osu")) {
                return res.render('calculate', {
                    err: "Invalid file uploaded"
                });
            }
            osuFile = file.data.toString("utf-8");
        }

        if (req.body.MapID && !osuFile) {
            const a: string[] = req.body.MapID.split("/");
            const beatmapID: number = parseInt(a[a.length - 1]);
            if (beatmapID <= 0 || isNaN(beatmapID)) {
                return res.render('calculate', {
                    err: "Invalid beatmap ID"
                });
            }

            osuFile = await downloadBeatmap(beatmapID);
            if (!osuFile) {
                return res.render('calculate', {
                    err: "Beatmap with specified beatmap ID is not available"
                });
            }
        }

        if (!osuFile) {
            return res.render('calculate', {
                err: "Beatmap ID not specified and no .osu file is uploaded"
            });
        }

        const mod: string = req.body.Mod || "";
        const acc: number = Math.max(0, Math.min(parseFloat(req.body.Accuracy), 100)) || 100;
        const miss: number = Math.max(0, parseInt(req.body.Miss)) || 0;

        const stats: MapStats = new MapStats();
        if (req.body.SpeedMul) {
            stats.speedMultiplier = Math.max(0.5, Math.min(parseFloat(req.body.SpeedMul), 2));
        }
        if (req.body.ForceAR) {
            stats.isForceAR = true;
            stats.ar = Math.max(0, Math.min(parseFloat(req.body.ForceAR), 12.5));
        }

        const star: MapStars = new MapStars().calculate({file: osuFile, mods: mod, stats: stats});
        if (star.pcStars.total === 0) {
            return res.render('calculate', {
                err: "Invalid file uploaded"
            });
        }

        const map: Beatmap = star.pcStars.map;
        const maxCombo = map.maxCombo();
        const combo: number = Math.max(0, Math.min(parseInt(req.body.Combo), maxCombo)) || maxCombo;

        const dpp: DroidPerformanceCalculator = new DroidPerformanceCalculator().calculate({
            stars: star.droidStars,
            combo: combo,
            accPercent: acc,
            miss: miss,
            stats: stats
        });

        const pp: OsuPerformanceCalculator = new OsuPerformanceCalculator().calculate({
            stars: star.pcStars,
            combo: combo,
            accPercent: acc,
            miss: miss,
            stats: stats
        });

        const statsForString: MapStats = new MapStats({
            cs: map.cs,
            ar: stats.isForceAR ? stats.ar : map.ar,
            od: map.od,
            hp: map.hp,
            mods: mod,
            speedMultiplier: stats.speedMultiplier,
            isForceAR: stats.isForceAR
        }).calculate({mode: modes.osu});

        let mapString: string = `${map.artist} - ${map.title} (${map.creator}) [${map.version}]${mod ? ` +${mod}` : ""}`;
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
            mapstat: `CS: ${map.cs}${statsForString.cs === map.cs ? "": ` (${(statsForString.cs as number).toFixed(2)})`} - AR: ${map.ar}${statsForString.ar === map.ar ? "": ` (${(statsForString.ar as number).toFixed(2)})`} - OD: ${map.od}${statsForString.od === map.od ? "" : ` (${(statsForString.od as number).toFixed(2)})`} - HP: ${map.hp}${statsForString.hp === map.hp ? "": ` (${(statsForString.hp as number).toFixed(2)})`}`,
            playstat: `Combo: ${Math.min(combo, maxCombo)}x/${maxCombo}x - Accuracy: ${acc.toFixed(2)}% - ${miss} ${miss === 1 ? "miss" : "misses"}`,
            ppentry: [
                {
                    type: "Droid",
                    sr: star.droidStars.total.toFixed(2),
                    aimsr: star.droidStars.aim.toFixed(2),
                    tapsr: star.droidStars.tap.toFixed(2),
                    rhythmsr: star.droidStars.rhythm.toFixed(2),
                    pp: dpp.total.toFixed(2),
                    aimpp: dpp.aim.toFixed(2),
                    tappp: dpp.tap.toFixed(2),
                    accpp: dpp.accuracy.toFixed(2)
                },
                {
                    type: "PC",
                    sr: star.pcStars.total.toFixed(2),
                    aimsr: star.pcStars.aim.toFixed(2),
                    speedsr: star.pcStars.speed.toFixed(2),
                    rhythmsr: "N/A",
                    pp: pp.total.toFixed(2),
                    aimpp: pp.aim.toFixed(2),
                    tappp: pp.speed.toFixed(2),
                    accpp: pp.accuracy.toFixed(2)
                }
            ]
        });
    });

    // app.get('/prototypecalculate', (req, res) => {
    //     res.render('prototypeCalculate');
    // });

    // app.post('/prototypecalculate', async (req, res) => {
    //     let osuFile: string = "";

    //     if (req.files) {
    //         const file: fileupload.UploadedFile|undefined = req.files.BeatmapFile;
    //         if (!file || !file.name.endsWith(".osu")) {
    //             return res.render('calculate', {
    //                 err: "Invalid file uploaded"
    //             });
    //         }
    //         osuFile = file.data.toString("utf-8");
    //     }

    //     if (req.body.MapID && !osuFile) {
    //         const a: string[] = req.body.MapID.split("/");
    //         const beatmapID: number = parseInt(a[a.length - 1]);
    //         if (beatmapID <= 0 || isNaN(beatmapID)) {
    //             return res.render('calculate', {
    //                 err: "Invalid beatmap ID"
    //             });
    //         }

    //         osuFile = await downloadBeatmap(beatmapID);
    //         if (!osuFile) {
    //             return res.render('calculate', {
    //                 err: "Beatmap with specified beatmap ID is not available"
    //             });
    //         }
    //     }

    //     if (!osuFile) {
    //         return res.render('calculate', {
    //             err: "Beatmap ID not specified and no .osu file is uploaded"
    //         });
    //     }

    //     const mod: string = req.body.Mod || "";
    //     const acc: number = Math.max(0, Math.min(parseFloat(req.body.Accuracy), 100)) || 100;
    //     const miss: number = Math.max(0, parseInt(req.body.Miss)) || 0;

    //     const stats: MapStats = new MapStats();
    //     if (req.body.SpeedMul) {
    //         stats.speedMultiplier = Math.max(0.5, Math.min(parseFloat(req.body.SpeedMul), 2));
    //     }
    //     if (req.body.ForceAR) {
    //         stats.isForceAR = true;
    //         stats.ar = Math.max(0, Math.min(parseFloat(req.body.ForceAR), 12.5));
    //     }

    //     const star: RebalanceMapStars = new RebalanceMapStars().calculate({file: osuFile, mods: mod, stats: stats});
    //     if (star.pcStars.total === 0) {
    //         return res.render('calculate', {
    //             err: "Invalid file uploaded"
    //         });
    //     }

    //     const map: Beatmap = star.pcStars.map;
    //     const maxCombo = map.maxCombo();
    //     const combo: number = Math.max(0, Math.min(parseInt(req.body.Combo), maxCombo)) || maxCombo;

    //     const realAcc: Accuracy = new Accuracy({
    //         percent: acc,
    //         nobjects: map.objects.length
    //     })

    //     const dpp: DroidPerformanceCalculator = new DroidPerformanceCalculator().calculate({
    //         stars: star.droidStars,
    //         combo: combo,
    //         accPercent: acc,
    //         miss: miss,
    //         stats: stats
    //     });

    //     const pp: OsuPerformanceCalculator = new OsuPerformanceCalculator().calculate({
    //         stars: star.pcStars,
    //         combo: combo,
    //         accPercent: acc,
    //         miss: miss,
    //         stats: stats
    //     });

    //     const statsForString: MapStats = new MapStats({
    //         cs: map.cs,
    //         ar: stats.isForceAR ? stats.ar : map.ar,
    //         od: map.od,
    //         hp: map.hp,
    //         mods: mod,
    //         speedMultiplier: stats.speedMultiplier,
    //         isForceAR: stats.isForceAR
    //     }).calculate({mode: modes.osu});

    //     let mapString: string = `${map.artist} - ${map.title} (${map.creator}) [${map.version}]${mod ? ` +${mod}` : ""}`;
    //     if (stats.speedMultiplier !== 1 || stats.isForceAR) {
    //         mapString += " (";
    //         if (stats.isForceAR) {
    //             mapString += `AR${stats.ar}`;
    //         }
    //         if (stats.speedMultiplier !== 1) {
    //             if (stats.isForceAR) {
    //                 mapString += ", ";
    //             }
    //             mapString += `${stats.speedMultiplier}x`;
    //         }
    //         mapString += ")";
    //     }

    //     res.render('prototypeCalculate', {
    //         maptitle: mapString,
    //         objectstat: `Circles: ${map.circles} - Sliders: ${map.sliders} - Spinners: ${map.spinners}`,
    //         mapstat: `CS: ${map.cs}${statsForString.cs === map.cs ? "": ` (${(statsForString.cs as number).toFixed(2)})`} - AR: ${map.ar}${statsForString.ar === map.ar ? "": ` (${(statsForString.ar as number).toFixed(2)})`} - OD: ${map.od}${statsForString.od === map.od ? "" : ` (${(statsForString.od as number).toFixed(2)})`} - HP: ${map.hp}${statsForString.hp === map.hp ? "": ` (${(statsForString.hp as number).toFixed(2)})`}`,
    //         playstat: `Combo: ${Math.min(combo, maxCombo)}x/${maxCombo}x - Accuracy: ${acc.toFixed(2)}%${!Precision.almostEqualsNumber(acc / 100, realAcc.value()) ? " (estimated)" : ""} - ${miss} ${miss === 1 ? "miss" : "misses"}`,
    //         ppentry: [
    //             {
    //                 type: "Droid",
    //                 sr: star.droidStars.total.toFixed(2),
    //                 aimsr: star.droidStars.aim.toFixed(2),
    //                 tapsr: star.droidStars.tap.toFixed(2),
    //                 rhythmsr: star.droidStars.rhythm.toFixed(2),
    //                 pp: dpp.total.toFixed(2),
    //                 aimpp: dpp.aim.toFixed(2),
    //                 tappp: dpp.tap.toFixed(2),
    //                 accpp: dpp.accuracy.toFixed(2)
    //             },
    //             {
    //                 type: "PC",
    //                 sr: star.pcStars.total.toFixed(2),
    //                 aimsr: star.pcStars.aim.toFixed(2),
    //                 tapsr: star.pcStars.speed.toFixed(2),
    //                 rhythmsr: "N/A",
    //                 pp: pp.total.toFixed(2),
    //                 aimpp: pp.aim.toFixed(2),
    //                 tappp: pp.speed.toFixed(2),
    //                 accpp: pp.accuracy.toFixed(2)
    //             }
    //         ]
    //     });
    // });

    app.get('/api/getplayertop', (req, res) => {
        const requestParams: string[] = req.url.split("?")[1]?.split("&") || [];
        if (requestParams.length !== 2) {
            return res.send(`{"code": 400, "error": "Please provide exactly 2 request parameters (uid and API key)."}`);
        }

        const key: string = requestParams.find(param => param.startsWith("key="))?.split("key=")[1] || "";
        if (!key) {
            return res.send(`{"code": 400, "error": "Please provide an API key."}`);
        }

        const uid: number = parseInt(requestParams.find(param => param.startsWith("uid="))?.split("uid=")[1] || "0");
        if (!uid) {
            return res.send(`{"code": 400, "error": "Please provide a valid uid."}`);
        }

        keydb.findOne({key: key}, (err, keyInfo) => {
            if (err) throw err;
            if (!keyInfo) {
                return res.send(`{"code": 400, "error": "Please provide a valid API key."}`);
            }

            binddb.findOne({uid: uid}, (err, playerInfo: BindDatabaseResponse) => {
                if (err) throw err;
                const responseObject = {
                    code: 200,
                    data: {}
                };
                if (!playerInfo) {
                    return res.send(JSON.stringify(responseObject));
                }

                const ppList: DatabasePPEntry[] = playerInfo.pp;
                ppList.forEach(v => delete v.scoreID);

                responseObject.data = {
                    uid: parseInt(playerInfo.uid),
                    username: playerInfo.username,
                    pp: {
                        total: playerInfo.pptotal,
                        list: ppList
                    }
                };

                res.send(JSON.stringify(responseObject).replace(/[<>]/g, ""));
            });
        });
    });

    const port = process.env.PORT || 5000;

    app.listen(port, () => {
        console.log(`Express running → PORT ${port}`);
    });
}