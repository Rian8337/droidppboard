import { Filter } from "mongodb";
import { IPrototypePP } from "app-structures";
import { Util } from "../../../utils/Util";
import { DatabaseCollectionManager } from "../DatabaseCollectionManager";

/**
 * A manager for the `prototypepp` collection.
 */
export class PrototypePPCollectionManager extends DatabaseCollectionManager<IPrototypePP> {
    override get defaultDocument(): IPrototypePP {
        return {
            discordid: "",
            lastUpdate: Date.now(),
            pp: [],
            pptotal: 0,
            prevpptotal: 0,
            reworkType: "overall",
            uid: 0,
            username: "",
            scanDone: true,
            previous_bind: [],
        };
    }

    /**
     * Gets the dpp rank of a specified dpp value.
     *
     * @param totalPP The total PP.
     * @param reworkType The rework type.
     */
    async getUserDPPRank(totalPP: number, reworkType: string): Promise<number> {
        return (
            (await this.collection.countDocuments({
                pptotal: { $gt: totalPP },
                reworkType: reworkType,
            })) + 1
        );
    }

    /**
     * Searches for players to display in leaderboard.
     *
     * @param page The page to display.
     * @param reworkType The rework type.
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
                    pptotal: 1,
                    prevpptotal: 1,
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
    getFromUid(uid: number): Promise<IPrototypePP | null> {
        return this.getOne(
            { previous_bind: { $all: [uid] } },
            {
                projection: {
                    _id: 0,
                    uid: 1,
                    username: 1,
                    pp: 1,
                    pptotal: 1,
                    prevpptotal: 1,
                    lastUpdate: 1,
                },
            },
        );
    }
}
