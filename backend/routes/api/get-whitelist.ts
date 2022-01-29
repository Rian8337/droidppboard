import express from "express";
import { Comparison, Util } from "../../utils/Util";
import { Filter, Sort } from "mongodb";
import { DatabaseMapWhitelist } from "../../database/structures/elainaDb/DatabaseMapWhitelist";
import { DatabaseManager } from "../../database/DatabaseManager";

const router: express.Router = express.Router();

router.get("/", async (req, res) => {
    const page: number = Math.max(1, parseInt(req.url.split('page=')[1]) || 1);
    const query: string = Util.convertURI(req.url.split('query=')[1] || "").toLowerCase();

    const mapQuery: Filter<DatabaseMapWhitelist> = {};
    const sort: Sort = {};

    if (query) {
        let mapNameQuery: string = "";
        const comparisonRegex: RegExp = /[<=>]{1,2}/;
        const finalQueries = query.split(/\s+/g);
        for (const finalQuery of finalQueries) {
            const split: string[] = finalQuery.split(comparisonRegex, 2);
            const key: string = split[0];
            let value: string = split[1];

            const comparison: Comparison = (comparisonRegex.exec(finalQuery) ?? ["="])[0] as Comparison;
            switch (key) {
                case "cs":
                case "ar":
                case "od":
                case "hp":
                case "sr":
                case "bpm": {
                    const propertyName: string = `diffstat.${key}`;
                    if (propertyName in mapQuery) {
                        Object.defineProperty(mapQuery[propertyName as keyof typeof mapQuery], Util.getComparisonText(comparison), { value: parseFloat(value), writable: true, configurable: true, enumerable: true });
                    } else {
                        Object.defineProperty(mapQuery, propertyName, { value: Util.getComparisonObject(comparison, parseFloat(value)), writable: true, configurable: true, enumerable: true });
                    }
                    break;
                }
                case "star":
                case "stars":
                    if ("diffstat.sr" in mapQuery) {
                        Object.defineProperty(mapQuery["diffstat.sr" as keyof typeof mapQuery], Util.getComparisonText(comparison), { value: parseFloat(value), writable: true, configurable: true, enumerable: true });
                    } else {
                        Object.defineProperty(mapQuery, "diffstat.sr", { value: Util.getComparisonObject(comparison, parseFloat(value)), writable: true, configurable: true, enumerable: true });
                    }
                    break;
                case "sort": {
                    const isDescendSort: boolean = value.startsWith("-");
                    if (isDescendSort) {
                        value = value.substring(1);
                    }
                    switch (value) {
                        case "beatmapid":
                        case "mapid":
                        case "id":
                            Object.defineProperty(sort, "mapid", { value: isDescendSort ? -1 : 1, writable: true, configurable: true, enumerable: true });
                            break;
                        case "beatmapname":
                        case "mapname":
                        case "name":
                            Object.defineProperty(sort, "mapname", { value: isDescendSort ? -1 : 1, writable: true, configurable: true, enumerable: true });
                            break;
                        case "cs":
                        case "ar":
                        case "od":
                        case "hp":
                        case "bpm":
                            Object.defineProperty(sort, `diffstat.${value}`, { value: isDescendSort ? -1 : 1, writable: true, configurable: true, enumerable: true });
                            break;
                        case "sr":
                        case "star":
                        case "stars":
                            Object.defineProperty(sort, "diffstat.sr", { value: isDescendSort ? -1 : 1, writable: true, configurable: true, enumerable: true });
                            break;
                        default:
                            mapNameQuery += finalQuery + " ";
                    }
                    break;
                }
                default:
                    mapNameQuery += finalQuery + " ";
            }
        }

        if (mapNameQuery) {
            const regexQuery: RegExp[] = mapNameQuery.trim().split(/\s+/g).map(v => { return new RegExp(Util.convertURIregex(v), "i"); });
            Object.defineProperty(mapQuery, "$and", { value: regexQuery.map(v => { return { mapname: v }; }), writable: false, configurable: true, enumerable: true });
        }
    }

    if (!("mapname" in sort)) {
        Object.defineProperty(sort, "mapname", { value: 1, writable: true, configurable: true, enumerable: true });
    }

    // Allow SR and BPM sort to override beatmap title sort
    if ("diffstat.sr" in sort || "diffstat.bpm" in sort) {
        delete sort["mapname"];
    }

    res.json(
        await DatabaseManager.elainaDb.collections.mapWhitelist.getWhitelistedBeatmaps(page, mapQuery, sort)
    );
});

export default router;