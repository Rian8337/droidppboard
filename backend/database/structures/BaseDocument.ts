import { Document, ObjectId } from "bson";

export interface BaseDocument extends Document {
    /**
     * The BSON object ID of this document in the database.
     */
    readonly _id?: ObjectId;
};