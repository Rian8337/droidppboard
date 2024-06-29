import { IPrototypePPType } from "app-structures";
import { DatabaseCollectionManager } from "../DatabaseCollectionManager";

/**
 * A manager for the `prototypepptype` collection.
 */
export class PrototypePPTypeCollectionManager extends DatabaseCollectionManager<IPrototypePPType> {
    override get defaultDocument(): IPrototypePPType {
        return {
            name: "",
            type: "",
        };
    }
}
