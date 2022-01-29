import express from "express";
import { join } from "path";
import { ModUtil } from "@rian8337/osu-base";
import { Util } from "../utils/Util";
import { DisplayTopPPEntry } from "../structures/DisplayTopPPEntry";

const router: express.Router = express.Router();

router.get("/", (req, res) => {
    const mod: string = req.url.split("?mods=")[1] || "";

    const droidMod: string =
        mod.toLowerCase() !== "nm"
            ? ModUtil.pcStringToMods(mod)
                .map((v) => v.droidString)
                .sort((a, b) => a.localeCompare(b))
                .join("") || ""
            : "-";

    const entries: DisplayTopPPEntry[] = (Util.topPPList.get(droidMod) ?? [])
        .map(v => {
            return {
                ...v,
                displayMods: ModUtil.pcStringToMods(v.mods)
            };
        });

    res.render(join(Util.getFrontendPath(), "render", "top-plays"), {
        entries: entries,
        mods: Util.convertURI(mod).toUpperCase(),
    });
});

export default router;
