import express from "express";
import { join } from "path";
import { ModUtil } from "../modules/utils/ModUtil";
import { Util } from "../utils/Util";

const router: express.Router = express.Router();

router.get("/", (req, res) => {
    const mod: string = req.url.split("?mods=")[1] || "";

    const droidMod: string = mod.toLowerCase() !== "nm" ? ModUtil.pcStringToMods(mod).map(v => v.droidString).sort((a, b) => a.localeCompare(b)).join("") || "" : "-";

    res.render(
        join(Util.getFrontendPath(), "render", "top-plays"),
        {
            entries: Util.topPPList.get(droidMod) ?? [],
            mods: Util.convertURI(mod).toUpperCase()
        }
    );
});

export default router;