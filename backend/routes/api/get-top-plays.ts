import express from "express";
import { ModUtil } from "@rian8337/osu-base";
import { Util } from "../../utils/Util";

const router: express.Router = express.Router();

router.get("/", async (req, res) => {
    const mod: string = req.url.split("mods=")[1] || "";

    const droidMod: string = mod.toLowerCase() !== "nm" ? ModUtil.pcStringToMods(mod).map(v => v.droidString).sort((a, b) => a.localeCompare(b)).join("") || "" : "-";

    res.json((Util.requestIsPrototype(req) ? Util.topPrototypePPList : Util.topPPList).get(droidMod) ?? []);
});

export default router;