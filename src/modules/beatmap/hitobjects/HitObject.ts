import { objectTypes } from '../../constants/objectTypes';
import { Vector2 } from '../../mathutil/Vector2';

/**
 * Represents a hitobject in a beatmap.
 */
export abstract class HitObject {
    /**
     * The start time of the object in milliseconds.
     */
    public startTime: number;

    /**
     * The bitwise type of the hitobject (circle/slider/spinner).
     */
    public readonly type: objectTypes;

    /**
     * The position of the hitobject in osu!pixels.
     */
    public readonly position: Vector2;

    /**
     * The end time of the hitobject.
     */
    public endTime: number;

    /**
     * The stacked position of the hitobject.
     */
    public stackedPosition: Vector2;

    /**
     * Whether or not this hitobject represents a new combo in the beatmap.
     */
    public readonly isNewCombo: boolean;

    /**
     * The stack height of the object.
     */
    public stackHeight: number;

    constructor(values: {
        startTime: number,
        position: Vector2,
        type: number,
        endTime?: number
    }) {
        this.startTime = values.startTime || 0;
        this.endTime = values.endTime || values.startTime;
        this.type = values.type || 0;
        this.position = values.position || new Vector2({x: 0, y: 0});
        this.stackedPosition = this.position;
        this.isNewCombo = !!(this.type & 1 << 2);
        this.stackHeight = 0;
    }

    /**
     * Returns the hitobject type.
     */
    typeStr(): string {
        let res = '';
        if (this.type & objectTypes.circle) {
            res += "circle | ";
        }
        if (this.type & objectTypes.slider) {
            res += "slider | ";
        }
        if (this.type & objectTypes.spinner) {
            res += "spinner | ";
        }
        return res.substring(0, Math.max(0, res.length - 3));
    }

    /**
     * Calculates the stacked position of the hitobject.
     */
    calculateStackedPosition(scale: number): void {
        const coordinate: number = this.stackHeight * scale * -6.4;
        const stackOffset: Vector2 = new Vector2({x: coordinate, y: coordinate});
        if (!(this.type & objectTypes.spinner)) {
            this.stackedPosition = this.position.add(stackOffset);
        }
    }

    /**
     * Returns the string representative of the class.
     */
    abstract toString(): string;
}