import { Filter } from "mongodb";
import { IInGamePP } from "app-structures";
import { Util } from "../../../utils/Util";
import { DatabaseCollectionManager } from "../DatabaseCollectionManager";

/**
 * A manager for the `ingamepp` collection.
 */
export class InGamePPCollectionManager extends DatabaseCollectionManager<IInGamePP> {
    override get defaultDocument(): IInGamePP {
        return {
            discordid: "",
            lastUpdate: Date.now(),
            playc: 0,
            pp: [],
            pptotal: 0,
            prevpptotal: 0,
            uid: 0,
            username: "",
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
    searchPlayers(page: number, searchQuery?: string): Promise<IInGamePP[]> {
        const query: Filter<IInGamePP> = searchQuery
            ? {
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
            : {};

        return this.collection
            .find(query, {
                projection: {
                    _id: 0,
                    uid: 1,
                    // Play count is needed to differentiate in-game pp from prototype pp.
                    playc: 1,
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
    getFromUid(uid: number): Promise<IInGamePP | null> {
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
