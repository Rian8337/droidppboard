import express from "express";
import { ModUtil } from "@rian8337/osu-base";
import { Util } from "../../../utils/Util";

const router: express.Router = express.Router();

router.use(Util.createRateLimit(8));

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

    const data = Util.requestIsPrototype(req)
        ? Util.topPrototypePPList
        : Util.topPPList;

    res.json(data.get(droidMod) ?? []);
});

export default router;
