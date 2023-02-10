import { Router } from "express";
import { DatabaseManager } from "../../../database/managers/DatabaseManager";

const router = Router();

router.get<
    "/",
    unknown,
    unknown,
    unknown,
    {
        discordid: string;
        name: string;
    }
>("/", async (req, res) => {
    const { discordid: discordId, name } = req.query;

    if (!discordId || !name) {
        return res.status(404).json({ message: "Skin not found!" });
    }

    res.json(
        await DatabaseManager.aliceDb.collections.playerSkins.getFromName(
            discordId,
            name
        )
    );
});

export default router;
