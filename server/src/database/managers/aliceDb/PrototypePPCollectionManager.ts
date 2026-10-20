import { Filter } from "mongodb";
import { IPrototypePP } from "app-structures";
import { Util } from "../../../utils/Util";
import { FullRunStore } from "../../../recalculation/RecalculationQueue";
import { DatabaseCollectionManager } from "../DatabaseCollectionManager";

/**
 * A manager for the `prototypepp` collection.
 */
export class PrototypePPCollectionManager
    extends DatabaseCollectionManager<IPrototypePP>
    implements FullRunStore
{
    /**
     * Fields that older versions stored, which are removed when a profile is saved.
     */
    private static readonly legacyFields: Record<string, ""> =
        Object.fromEntries(
            [
                "prevStarRating",
                "prevAimDifficulty",
                "prevTapDifficulty",
                "prevRhythmDifficulty",
                "prevFlashlightDifficulty",
                "prevReadingDifficulty",
                "newStarRating",
                "newAimDifficulty",
                "newTapDifficulty",
                "newRhythmDifficulty",
                "newFlashlightDifficulty",
                "newReadingDifficulty",
                "prevAim",
                "prevTap",
                "prevAccuracy",
                "prevFlashlight",
                "prevReading",
                "newAim",
                "newTap",
                "newAccuracy",
                "newFlashlight",
                "newReading",
                "prevpptotal",
                "pptotal",
                "liveTapPenalty",
                "rebalanceTapPenalty",
                "sliderCheesePenalty",
                "estimatedUnstableRate",
                "estimatedSpeedUnstableRate",
            ].map((field) => [field, ""]),
        );

    override get defaultDocument(): IPrototypePP {
        return {
            livePPTotal: 0,
            localPPTotal: 0,
            lastUpdate: Date.now(),
            pp: [],
            reworkType: "droid-rebalance",
            uid: 0,
            username: "",
            scanDone: true,
        };
    }

    /**
     * Gets the dpp rank of a specified dpp value.
     *
     * @param totalPP The total PP.
     * @param reworkType The variant.
     */
    async getUserDPPRank(totalPP: number, reworkType: string): Promise<number> {
        return (
            (await this.collection.countDocuments({
                localPPTotal: { $gt: totalPP },
                reworkType: reworkType,
            })) + 1
        );
    }

    /**
     * Searches for players to display in leaderboard.
     *
     * @param page The page to display.
     * @param reworkType The variant.
     * @param searchQuery The player search query, if any.
     * @returns The players, up to 50 players.
     */
    searchPlayers(
        page: number,
        reworkType: string,
        searchQuery?: string,
    ): Promise<IPrototypePP[]> {
        const query: Filter<IPrototypePP> = searchQuery
            ? {
                  reworkType: reworkType,
                  $or: [
                      { uid: parseInt(searchQuery) },
                      {
                          username: new RegExp(
                              Util.convertURIregex(searchQuery),
                              "i",
                          ),
                      },
                  ],
              }
            : {
                  reworkType: reworkType,
              };

        return this.collection
            .find(query, {
                projection: {
                    _id: 0,
                    uid: 1,
                    livePPTotal: 1,
                    localPPTotal: 1,
                    masterPPTotal: 1,
                    username: 1,
                    lastUpdate: 1,
                },
            })
            .sort({ localPPTotal: -1 })
            .skip(50 * (page - 1))
            .limit(50)
            .toArray();
    }

    /**
     * Stores a player's calculated profile in a variant, creating it if it does not exist.
     *
     * @param uid The uid of the player.
     * @param reworkType The variant.
     * @param profile The calculated profile.
     */
    async saveProfile(
        uid: number,
        reworkType: string,
        profile: Pick<
            IPrototypePP,
            "pp" | "localPPTotal" | "livePPTotal" | "masterPPTotal" | "username"
        >,
    ): Promise<void> {
        const { masterPPTotal, ...rest } = profile;

        await this.collection.updateOne(
            { uid, reworkType },
            {
                $set: {
                    ...rest,
                    // An undefined value would be stored as null.
                    ...(masterPPTotal !== undefined && { masterPPTotal }),
                    lastUpdate: Date.now(),
                    scanDone: true,
                },
                $unset: PrototypePPCollectionManager.legacyFields,
            },
            { upsert: true },
        );
    }

    /**
     * Gets the bind information of an osu!droid account from its uid.
     *
     * @param uid The uid of the osu!droid account.
     * @param reworkType The variant.
     */
    getFromUid(uid: number, reworkType: string): Promise<IPrototypePP | null> {
        return this.getOne(
            { uid: uid, reworkType: reworkType },
            {
                projection: {
                    _id: 0,
                    uid: 1,
                    username: 1,
                    pp: 1,
                    livePPTotal: 1,
                    localPPTotal: 1,
                    masterPPTotal: 1,
                    lastUpdate: 1,
                },
            },
        );
    }

    countProfiles(reworkType: string): Promise<number> {
        return this.collection.countDocuments({ reworkType });
    }

    countScanned(reworkType: string): Promise<number> {
        return this.collection.countDocuments({ reworkType, scanDone: true });
    }

    async getUnscannedUids(
        reworkType: string,
        excludeUids: number[],
        limit: number,
    ): Promise<number[]> {
        const profiles = await this.collection
            .find(
                {
                    reworkType,
                    scanDone: { $ne: true },
                    uid: { $nin: excludeUids },
                },
                { projection: { _id: 0, uid: 1 } },
            )
            .sort({ localPPTotal: -1 })
            .limit(limit)
            .toArray();

        return profiles.map((p) => p.uid);
    }

    async resetScanDone(reworkType: string): Promise<void> {
        await this.collection.updateMany(
            { reworkType },
            { $set: { scanDone: false } },
        );
    }

    /**
     * Adds a not-yet-scanned, empty profile to a rework type for every player that has a
     * profile in another rework type but none in this one. Existing profiles are left as they
     * are, and a profile saved at the same time is not duplicated, as each profile is an
     * upsert that sets its fields only on insert.
     *
     * @param source The rework type to take the players from.
     * @param target The rework type to add the profiles to.
     */
    async addMissingProfiles(source: string, target: string): Promise<void> {
        const profiles = await this.collection
            .find(
                { reworkType: source },
                { projection: { _id: 0, uid: 1, username: 1 } },
            )
            .toArray();

        const lastUpdate = Date.now();
        const batchSize = 1000;

        for (let i = 0; i < profiles.length; i += batchSize) {
            await this.collection.bulkWrite(
                profiles.slice(i, i + batchSize).map(({ uid, username }) => ({
                    updateOne: {
                        filter: { uid, reworkType: target },
                        update: {
                            $setOnInsert: {
                                username,
                                pp: [],
                                localPPTotal: 0,
                                livePPTotal: 0,
                                lastUpdate,
                                scanDone: false,
                            },
                        },
                        upsert: true,
                    },
                })),
                { ordered: false },
            );
        }
    }
}
