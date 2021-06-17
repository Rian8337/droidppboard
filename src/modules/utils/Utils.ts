/**
 * Some utilities, no biggie.
 */
export abstract class Utils {
    /**
     * Creates an array with specific length that's prefilled with an initial value.
     * 
     * @param length The length of the array.
     * @param initialValue The initial value of each array value.
     */
    static initializeArray<T>(length: number, initialValue?: T): T[]  {
        const array: T[] = [];

        if (initialValue !== undefined) {
            for (let i = 0; i < length; ++i) {
                if (Array.isArray(initialValue)) {
                    array.push(JSON.parse(JSON.stringify(initialValue)));
                } else {
                    array.push(initialValue);
                }
            }
        }

        return array;
    }
}