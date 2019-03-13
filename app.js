var express = require('express');
var mongodb = require('mongodb');
var pug = require('pug');
var https = require('https');
var osu = require ('./ojsama')
require("dotenv").config();
var dbkey = process.env.DB_KEY

var app = express();

app.set('view engine', 'pug');

let uri = 'mongodb://' + dbkey + '@elainadb-shard-00-00-r6qx3.mongodb.net:27017,elainadb-shard-00-01-r6qx3.mongodb.net:27017,elainadb-shard-00-02-r6qx3.mongodb.net:27017/test?ssl=true&replicaSet=ElainaDB-shard-0&authSource=admin&retryWrites=true';
let maindb = '';
let clientdb = new mongodb.MongoClient(uri, {useNewUrlParser: true})

clientdb.connect( function(err, db) {
    if (err) throw err;
    //if (db) 
    maindb = db.db('ElainaDB');
    console.log("DB connection established");
    binddb = maindb.collection('userbind');
    whitelistdb = maindb.collection('mapwhitelist');
    makeBoard();
});

function makeBoard() {
    app.get('/', (req, res) => {
        var page = parseInt(req.url.split('?page=')[1]);
        if (!page) {page = 1;}
        var ppsort = { pptotal: -1 };
        binddb.find({}, { projection: { _id: 0, discordid: 1, uid: 1, pptotal: 1 , playc: 1, username: 1}}).sort(ppsort).skip((page-1)*50).limit(50).toArray(function(err, resarr) {
            if (err) throw err;
            //console.log(res);
            var entries = [];
            for (i in resarr) {
                if (resarr[i].pptotal) { entries.push(resarr[i]); }
            }
            for (i in entries) {
                entries[i].pptotal = entries[i].pptotal.toFixed(2);
            }
            var title = 'PP Board'
            res.render('main', {
                title: title,
                list: entries,
                page: page
            });        
        });
    });

    app.get('/whitelist', (req, res) => {
        var page = parseInt(req.url.split('?page=')[1]);
        if (!page) {page = 1;}
        var mapsort = { mapname: 1 };
        whitelistdb.find({}, {projection: {_id: 0}}).sort(mapsort).skip((page-1)*30).limit(30).toArray(function(err, resarr) {
            //console.log(resarr);
            var title = 'Map Whitelisting Board'
            res.render('whitelist', {
                title: title,
                list: resarr,
                page: page
            })
        })
    });

    app.get('/about', (req, res) => {
        res.render('about');
    });

    app.get('/profile', (req, res) => {
        var uid = req.url.split('uid=')[1]
        if (!uid) {res.send("404 Page Not Found"); return;}
        binddb.findOne({uid: uid}, function(err, findres){
            if (err) throw err;
            var title = "Player Profile";
            var username = findres.username;
            var pptotal = findres.pptotal.toFixed(2);
            var ppentries = findres.pp;
            res.render('profile', {
                title: title,
                username: username,
                pptotal: pptotal,
                entries: ppentries
            })
        }) 
    })

    app.get('/beatmapsr', (req, res) => {
        console.log(req.url);
        var input = req.url.split('?b=')[1];
        var lineslit = input.split('+')
        var b = lineslit[0];
        var m = lineslit[1];
        if (!b) {
            console.log('error: no map input'); 
            res.send('error: no map input')
            return;
        }
        if (m) var mods = osu.modbits.from_string(m.slice(0) || "")
        else var mods = 0;
        console.log(mods);
        https.get('https://osu.ppy.sh/osu/' + b, (mres) => {
            var data = '';
            mres.on('data', (chunk) => {data += chunk;})
            mres.on('end', () => {
                if (!data) {
                    console.log('error: map not found'); 
                    res.send('error: map not found')
                    return;
                }
                var parser = new osu.parser();
                parser.feed(data);
                map = parser.map;
                if (map.ncircles == 0 && map.nsliders == 0) {
                    console.log('error: no object found'); 
                    res.send('error: no object found')
                    return;
                }
                var stars = new osu.diff().calc({map: map, mods: mods});
                res.send(stars.toString());
                parser.reset();
            }) 
        })
    })

    // app.get('/', (req, res) => {
    //     res.send(resArr);
    // });
    
    const port = process.env.PORT || 5000;
    
    app.listen(port, () => {
        console.log(`Express running → PORT ${port}`);
    });
}


