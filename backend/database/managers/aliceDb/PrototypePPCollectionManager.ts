import { Collection, Filter } from "mongodb";
import { Util } from "../../../utils/Util";
import { DatabaseUtilityConstructor } from "../../DatabaseUtilityConstructor";
import { DatabasePrototypePP } from "../../structures/aliceDb/DatabasePrototypePP";
import { PrototypePP } from "../../utils/aliceDb/PrototypePP";
import { DatabaseCollectionManager } from "../DatabaseCollectionManager";

/**
 * A manager for the `prototypepp` collection.
 */
export class PrototypePPCollectionManager extends DatabaseCollectionManager<
    DatabasePrototypePP,
    PrototypePP
> {
    protected override readonly utilityInstance: DatabaseUtilityConstructor<
        DatabasePrototypePP,
        PrototypePP
    >;

    override get defaultDocument(): DatabasePrototypePP {
        return {
            discordid: "",
            lastUpdate: Date.now(),
            pp: [],
            pptotal: 0,
            prevpptotal: 0,
            uid: 0,
            username: "",
            scanDone: true,
            previous_bind: [],
        };
    }

    /**
     * @param collection The MongoDB collection.
     */
    constructor(collection: Collection<DatabasePrototypePP>) {
        super(collection);

        this.utilityInstance = <
            DatabaseUtilityConstructor<DatabasePrototypePP, PrototypePP>
            >new PrototypePP().constructor;
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
    ): Promise<PrototypePP[]> {
        const query: Filter<DatabasePrototypePP> = searchQuery
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

        const userBind: DatabasePrototypePP[] = await this.collection
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

        return userBind.map((v) => new PrototypePP(v));
    }

    /**
     * Gets the bind information of an osu!droid account from its uid.
     *
     * @param uid The uid of the osu!droid account.
     */
    getFromUid(uid: number): Promise<PrototypePP | null> {
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
            }
        );
    }
}
