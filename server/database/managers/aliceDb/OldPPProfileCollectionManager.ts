import { IOldPPProfile } from "app-structures";
import { Filter } from "mongodb";
import { Util } from "../../../utils/Util";
import { DatabaseCollectionManager } from "../DatabaseCollectionManager";

/**
 * A manager for the `playeroldpp` collection.
 */
export class OldPPProfileCollectionManager extends DatabaseCollectionManager<IOldPPProfile> {
    override get defaultDocument(): IOldPPProfile {
        return {
            discordId: "",
            uid: 0,
            username: "",
            playc: 0,
            pptotal: 0,
            weightedAccuracy: 0,
            pp: [],
            previous_bind: [],
        };
    }

    /**
     * Gets the dpp rank of a specified dpp value.
     *
     * @param totalPP The total PP.
     */
    async getUserDPPRank(totalPP: number): Promise<number> {
        return (
            (await this.collection.countDocuments({
                pptotal: { $gt: totalPP },
            })) + 1
        );
    }

    /**
     * Searches for players to display in leaderboard.
     *
     * @param page The page to display.
     * @param searchQuery The player search query, if any.
     * @returns The players, up to 50 players.
     */
    async searchPlayers(
        page: number,
        searchQuery?: string
    ): Promise<IOldPPProfile[]> {
        const query: Filter<IOldPPProfile> = searchQuery
            ? {
                  $or: [
                      { uid: parseInt(searchQuery) },
                      {
                          username: new RegExp(
                              Util.convertURIregex(searchQuery),
                              "i"
                          ),
                      },
                  ],
              }
            : {};

        return this.collection
            .find(query, {
                projection: {
                    _id: 0,
                    discordId: 1,
                    uid: 1,
                    pptotal: 1,
                    playc: 1,
                    username: 1,
                },
            })
            .sort({ pptotal: -1 })
            .skip(50 * (page - 1))
            .limit(50)
            .toArray();
    }

    /**
     * Gets the bind information of an osu!droid account from its uid.
     *
     * @param uid The uid of the osu!droid account.
     */
    getFromUid(uid: number): Promise<IOldPPProfile | null> {
        return this.getOne(
            { previous_bind: { $all: [uid] } },
            {
                projection: {
                    _id: 0,
                    uid: 1,
                    username: 1,
                    pp: 1,
                    pptotal: 1,
                    playc: 1,
                },
            }
        );
    }
}
