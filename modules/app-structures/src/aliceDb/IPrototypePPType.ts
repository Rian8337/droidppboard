/**
 * Represents a prototype pp type in the database, which classifies the rework a prototype profile is in.
 */
export interface IPrototypePPType {
    /**
     * The type of the rework.
     */
    readonly type: string;

    /**
     * The name of the rework.
     */
    readonly name: string;
}
