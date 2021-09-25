import * as request from 'request';
import * as mongodb from 'mongodb';
import { BindDatabaseResponse } from './interfaces/BindDatabaseResponse';
import { DatabasePPEntry } from './interfaces/DatabasePPEntry';
import { PPEntry } from './interfaces/PPEntry';
import { PPList } from './interfaces/PPList';
import { PrototypePPList } from './interfaces/PrototypePPList';
import { PrototypePPEntry } from './interfaces/PrototypePPEntry';
import { PrototypeDatabaseResponse } from './interfaces/PrototypeDatabaseResponse';
import { PrototypeDatabasePPEntry } from './interfaces/PrototypeDatabasePPEntry';
import { ModUtil } from './modules/utils/ModUtil';

export type Comparison = "<=" | "<" | "=" | ">" | ">=";

export function convertURI(input: string): string {
    input = decodeURIComponent(input);
    const arr: string[] = input.split("");
    for (let i = 0; i < arr.length; ++i) {
        if (i != arr.length-1 && arr[i] === '+' && arr[i+1] !== '+') {
            arr[i] = ' ';
        }
    }

    input = arr.join("");
    return input;
}

export function convertURIregex(input: string): string {
    input = decodeURIComponent(input);
    const arr: string[] = input.split("");
    for (let i = 0; i < arr.length; ++i) {
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
        if (i != arr.length-1 && arr[i] == '+' && arr[i+1] != '+') {
            arr[i] = ' ';
        }
        if (arr[i] == "+") {
            arr[i] = "[+]";
        }
    }
    input = arr.join("");
    return input;
}

export function getComparisonText(comparison: Comparison): string {
    switch (comparison) {
        case "<":
            return "$lt";
        case "<=":
            return "$lte";
        case ">":
            return "$gt";
        case ">=":
            return "$gte";
        default:
            return "$eq";
    }
}

export function getComparisonObject(comparison: Comparison, value: number): object {
    const comparisonString: string = getComparisonText(comparison);

    return Object.defineProperty({}, comparisonString, {value, writable: true, configurable: true, enumerable: true});
}

export function downloadBeatmap(beatmapID: number): Promise<string> {
    return new Promise(resolve => {
        let data: string = "";
        request(`https://osu.ppy.sh/osu/${beatmapID}`, {encoding: "utf-8"})
            .on("data", chunk => {
                data += chunk;
            })
            .on("complete", () => {
                resolve(data);
            });
    });
}

export function refreshtopPP(binddb: mongodb.Collection, top_pp_list: PPList[]): void {
    console.log("Refreshing top pp list");
    setTimeout(() => refreshtopPP(binddb, top_pp_list), 1800000);
    binddb.find({}, { projection: { _id: 0, username: 1, pp: 1}}).toArray(function(err, res: BindDatabaseResponse[]) {
        top_pp_list.length = 0;
        top_pp_list.push({mods: "", list: []}, {mods: "-", list: []});
        res.forEach((val, index) => {
            const ppEntries: DatabasePPEntry[] = val.pp;
            for (const ppEntry of ppEntries) {
                const entry: PPEntry = {
                    username: val.username,
                    map: ppEntry.title + (ppEntry.mods ? " +" + ppEntry.mods : ""),
                    rawpp: ppEntry.pp,
                    combo: ppEntry.combo,
                    acc_percent: ppEntry.accuracy,
                    miss_c: ppEntry.miss
                };
                top_pp_list[0].list.push(entry);

                const droidMods: string = ModUtil.pcStringToMods(ppEntry.mods).map(v => v.droidString).join("") || "-";
                const index: number = top_pp_list.findIndex(v => v.mods === droidMods);
                if (index !== -1) {
                    top_pp_list[index].list.push(entry);
                } else {
                    top_pp_list.push({
                        mods: droidMods,
                        list: [entry]
                    });
                }
            }
            top_pp_list.forEach(v => {
                v.list.sort((a, b) => {
                    return b.rawpp - a.rawpp;
                });
                if (v.list.length >= 100) {
                    v.list.splice(100);
                }
            });

            if (index === res.length - 1) {
                console.log("Done");
            }
        });
    });
}

export function refreshPrototypeTopPP(prototypedb: mongodb.Collection, topList: PrototypePPList[]): void {
    console.log("Refreshing prototype top pp list");
    setTimeout(() => refreshPrototypeTopPP(prototypedb, topList), 600000);
    prototypedb.find({}, { projection: { _id: 0, username: 1, pp: 1}}).toArray(function(err, res: PrototypeDatabaseResponse[]) {
        topList.length = 0;
        topList.push({mods: "", list: []}, {mods: "-", list: []});
        res.forEach((val, index) => {
            const ppEntries: PrototypeDatabasePPEntry[] = val.pp;
            for (const ppEntry of ppEntries) {
                const entry: PrototypePPEntry = {
                    username: val.username,
                    map: ppEntry.title + (ppEntry.mods ? " +" + ppEntry.mods : ""),
                    rawpp: ppEntry.pp,
                    prevpp: ppEntry.prevPP,
                    combo: ppEntry.combo,
                    acc_percent: ppEntry.accuracy,
                    miss_c: ppEntry.miss
                };
                topList[0].list.push(entry);

                const droidMods: string = ModUtil.pcStringToMods(ppEntry.mods).map(v => v.droidString).join("") || "-";
                const index: number = topList.findIndex(v => v.mods === droidMods);
                if (index !== -1) {
                    topList[index].list.push(entry);
                } else {
                    topList.push({
                        mods: droidMods,
                        list: [entry]
                    });
                }
            }
            topList.forEach(v => {
                v.list.sort((a, b) => {
                    return b.rawpp - a.rawpp;
                });
                if (v.list.length >= 100) {
                    v.list.splice(100);
                }
            });

            if (index === res.length - 1) {
                console.log("Done");
            }
        });
    });
}