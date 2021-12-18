import { BaseDocument } from "../structures/BaseDocument";
import { DatabaseUtilityConstructor } from "../DatabaseUtilityConstructor";
import { Collection, Filter, FindOptions } from "mongodb";

/**
 * A MongoDB collection manager.
 */
export abstract class DatabaseCollectionManager<T extends BaseDocument, C> {
    /**
     * The collection that this manager is responsible for.
     */
    protected readonly collection: Collection<T>;

    /**
     * The constructor function of the utility of this collection.
     */
    protected abstract readonly utilityInstance: DatabaseUtilityConstructor<
        T,
        C
    >;

    /**
     * The default document of this collection.
     */
    abstract get defaultDocument(): T;

    /**
     * The default instance of this collection utility.
     */
    get defaultInstance(): C {
        return new this.utilityInstance(this.defaultDocument);
    }

    /**
     * @param collection The MongoDB collection.
     */
    constructor(collection: Collection<T>) {
        this.collection = collection;
    }

    /**
     * Gets multiple documents from the collection.
     *
     * @param filter The document filter.
     * @returns The documents.
     */
    async get(filter?: Filter<T>): Promise<C[]>;

    /**
     * Gets multiple documents from the collection.
     *
     * @param filter The document filter.
     * @param options The options for retrieving the documents.
     * @returns The documents.
     */
    async get(filter: Filter<T>, options?: FindOptions<T>): Promise<C[]>;

    /**
     * Gets multiple documents from the collection.
     *
     * @param filter The document filter.
     * @param options The options for retrieving the documents.
     * @returns The documents.
     */
    async get(filter: Filter<T>, options: FindOptions<T>): Promise<C[]>;

    /**
     * Gets multiple documents from the collection.

     * @param filter The document filter.
     * @param options The options for retrieving the documents. 
     * @returns The documents.
     */
    async get(filter: Filter<T> = {}, options?: FindOptions<T>): Promise<C[]> {
        const res: T[] = await this.collection.find(filter, options).toArray();

        return res.map((v) => new this.utilityInstance(v));
    }

    /**
     * Gets a document from the collection and convert it
     * to its utility.
     *
     * @param filter The document filter.
     * @returns The converted document.
     */
    async getOne(filter?: Filter<T>): Promise<C | null>;

    /**
     * Gets a document from the collection and convert it
     * to its utility.
     *
     * @param filter The document filter.
     * @param options The options for retrieving the documents.
     * @returns The converted document.
     */
    async getOne(filter: Filter<T>, options: FindOptions<T>): Promise<C | null>;

    /**
     * Gets a document from the collection and convert it
     * to its utility.
     *
     * @param filter The document filter.
     * @param options The options for retrieving the documents.
     * @returns The converted document.
     */
    async getOne(
        filter: Filter<T>,
        options?: FindOptions<T>
    ): Promise<C | null>;

    /**
     * Gets a document from the collection and convert it
     * to its utility.
     *
     * @param filter The document filter.
     * @param options The options for retrieving the documents.
     * @returns The converted document.
     */
    async getOne(
        filter: Filter<T> = {},
        options?: FindOptions<T>
    ): Promise<C | null> {
        const res: T | null = await this.collection.findOne(filter, options);

        return res ? new this.utilityInstance(res) : null;
    }
}
