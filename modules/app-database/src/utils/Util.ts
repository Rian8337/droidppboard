/**
 * Some utilities, no biggie.
 */
export abstract class Util {
    static convertURIregex(input: string): string {
        input = decodeURIComponent(input);

        const arr: string[] = input.split("");

        const characterToReplace: string = "*?$()[]\"':";

        for (let i = 0; i < arr.length; ++i) {
            if (characterToReplace.includes(arr[i])) {
                arr[i] = `[${arr[i]}]`;
            }

            if (i !== arr.length - 1 && arr[i] === "+" && arr[i + 1] !== "+") {
                arr[i] = " ";
            }

            if (arr[i] === "+") {
                arr[i] = "[+]";
            }
        }

        return arr.join("");
    }
}