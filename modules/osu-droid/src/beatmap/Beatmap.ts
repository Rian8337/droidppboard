import { Slider } from './hitobjects/Slider';
import { HitObject } from './hitobjects/HitObject';
import { BreakPoint } from './timings/BreakPoint';
import { TimingPoint } from './timings/TimingPoint';

/**
 * Represents a beatmap with advanced information.
 */
export class Beatmap {
    /**
     * The format version of the beatmap.
     */
    public formatVersion: number = 1;

    /**
     * The title of the song of the beatmap.
     */
    public title: string = "";

    /**
     * The unicode title of the song of the beatmap.
     */
    public titleUnicode: string = "";

    /**
     * The artist of the song of the beatmap.
     */
    public artist: string = "";

    /**
     * The unicode artist of the song of the beatmap.
     */
    public artistUnicode: string = "";

    /**
     * The creator of the beatmap.
     */
    public creator: string = "";

    /**
     * The difficulty name of the beatmap.
     */
    public version: string = "";

    /**
     * The approach rate of the beatmap.
     */
    public ar?: number = undefined;

    /**
     * The circle size of the beatmap.
     */
    public cs: number = 5;

    /**
     * The overall difficulty of the beatmap.
     */
    public od: number = 5;

    /**
     * The health drain rate of the beatmap.
     */
    public hp: number = 5;

    /**
     * The slider velocity of the beatmap.
     */
    public sv: number = 1;

    /**
     * The slider tick rate of the beatmap.
     */
    public tickRate: number = 1;

    /**
     * The amount of circles in the beatmap.
     */
    public circles: number = 0;

    /**
     * The amount of sliders in the beatmap.
     */
    public sliders: number = 0;

    /**
     * The amount of spinners in the beatmap.
     */
    public spinners: number = 0;

    /**
     * The objects of the beatmap.
     */
    public objects: Array<HitObject> = [];

    /**
     * The timing points of the beatmap.
     */
    public timingPoints: Array<TimingPoint> = [];

    /**
     * The break points of the beatmap.
     */
    public breakPoints: Array<BreakPoint> = [];

    /**
     * The stack leniency of the beatmap.
     */
    public stackLeniency: number = 0.7;

    /**
     * Calculates the maximum combo of the beatmap.
     */
    maxCombo(): number {
        let res: number = this.circles + this.spinners;
        this.objects.filter(v => v instanceof Slider).forEach(v => res += (v as Slider).nestedHitObjects.length);
        return res;
    }

    /**
     * Returns a string representative of the class.
     */
    toString(): string {
        let res = this.artist + " - " + this.title + " [";
        if (this.titleUnicode || this.artistUnicode) {
            res += "(" + this.artistUnicode + " - "
                + this.titleUnicode + ")";
        }
        res += (
            this.version + "] mapped by " + this.creator + "\n"
            + "\n"
            + "AR" + parseFloat((this.ar as number).toFixed(2)) + " "
            + "OD" + parseFloat(this.od.toFixed(2)) + " "
            + "CS" + parseFloat(this.cs.toFixed(2)) + " "
            + "HP" + parseFloat(this.hp.toFixed(2)) + "\n"
            + this.circles + " circles, "
            + this.sliders + " sliders, "
            + this.spinners + " spinners" + "\n"
            + this.maxCombo() + " max combo" + "\n"
        );
        return res;
    }
}