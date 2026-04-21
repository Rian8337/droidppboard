import { Interpolation, RGBColor } from "@rian8337/osu-base";

/**
 * Some utilities, no biggie.
 */
export abstract class Util {
    private static readonly red = new RGBColor(250, 82, 82);
    private static readonly green = new RGBColor(64, 192, 87);
    private static readonly white = new RGBColor(255, 255, 255);

    /**
     * Parses possible combination mods from a string.
     *
     * @param str The string to parse from.
     * @returns The mod combinations.
     */
    static parseMods(str: string): string[] | null {
        return str.toUpperCase().match(/[\s\S]{2}/g);
    }

    /**
     * Obtains a color based on the difference between two values. Positive differences yield greener colors, while negative differences yield redder colors.
     *
     * @param diff The difference between two values.
     * @returns The color representing the difference.
     */
    static getDiffColor(diff: number): RGBColor {
        const ratio = Math.max(-100, Math.min(100, diff)) / 100;
        let color = this.white;

        if (ratio > 0) {
            color = new RGBColor(
                Interpolation.lerp(color.r, this.green.r, ratio),
                Interpolation.lerp(color.g, this.green.g, ratio),
                Interpolation.lerp(color.b, this.green.b, ratio)
            );
        } else if (ratio < 0) {
            color = new RGBColor(
                Interpolation.lerp(this.red.r, color.r, ratio),
                Interpolation.lerp(this.red.g, color.g, ratio),
                Interpolation.lerp(this.red.b, color.b, ratio)
            );
        }

        return color;
    }
}
