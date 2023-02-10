import express from "express";
import { ModUtil } from "@rian8337/osu-base";
import { Util } from "../../../utils/Util";

const router: express.Router = express.Router();

router.get("/", async (req, res) => {
    const mod = req.url.split("mods=")[1] || "";

    const droidMod =
        mod.toLowerCase() !== "nm"
            ? [
                  ...ModUtil.pcStringToMods(mod).reduce((a, v) => {
                      if (!v.isApplicableToDroid()) {
                          return a;
                      }

                      return a + v.droidString;
                  }, ""),
              ]
                  .sort((a, b) => a.localeCompare(b))
                  .join("") || ""
            : "-";

    let data;

    switch (true) {
        case Util.requestIsPrototype(req):
            data = Util.topPrototypePPList;
            break;
        case Util.requestIsOld(req):
            data = Util.topOldPPList;
            break;
        default:
            data = Util.topPPList;
    }

    res.json(data.get(droidMod) ?? []);
});

export default router;
