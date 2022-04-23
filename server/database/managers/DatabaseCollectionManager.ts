import { Collection, Filter, FindOptions } from "mongodb";

/**
 * A MongoDB collection manager.
 */
export abstract class DatabaseCollectionManager<T> {
    /**
     * The collection that this manager is responsible for.
     */
    protected readonly collection: Collection<T>;

    /**
     * The default document of this collection.
     */
    abstract get defaultDocument(): T;

    /**
     * @param collection The MongoDB collection.
     */
    constructor(collection: Collection<T>) {
        this.collection = collection;
    }

    /**
     * Gets multiple documents from the collection.
     * @param filter The document filter.
     * @param options The options for retrieving the documents.
     * @returns The documents.
     */
    get(filter: Filter<T> = {}, options?: FindOptions<T>): Promise<T[]> {
        return <Promise<T[]>>this.collection.find(filter, options).toArray();
    }

    /**
     * Gets a document from the collection and convert it
     * to its utility.
     *
     * @param filter The document filter.
     * @param options The options for retrieving the documents.
     * @returns The converted document.
     */
    getOne(
        filter: Filter<T> = {},
        options?: FindOptions<T>
    ): Promise<T | null> {
        return this.collection.findOne(filter, options);
    }
}
