import { Spinner } from "../../beatmap/hitobjects/Spinner";
import { DifficultyHitObject } from "../../beatmap/hitobjects/DifficultyHitObject";
import { modes } from '../../constants/modes';

export interface DifficultyValue {
    readonly difficulty: number;
    readonly total: number;
}

/**
 * Base class for skill aspects.
 */
export abstract class Skill {
    /**
     * The previous hitobjects during a section.
     */
    protected readonly previous: DifficultyHitObject[] = [];

    /**
     * The strain of currently calculated hitobject.
     */
    protected currentStrain: number = 1;

    /**
     * The current section's strain peak.
     */
    private currentSectionPeak: number = 1;

    /**
     * Strain peaks are stored here.
     */
    private readonly strainPeaks: number[] = [];

    /**
     * Skill multiplier for currently calculated difficulty factor.
     */
    protected abstract readonly skillMultiplier: number;

    /**
     * Strain decay base for currently calculated difficulty factor.
     */
    protected abstract readonly strainDecayBase: number;

    /**
     * Angle threshold to start giving bonus.
     */
    protected abstract readonly angleBonusBegin: number;

    /**
     * Saves the current strain peak.
     */
    saveCurrentPeak(): void {
        if (this.previous.length > 0) {
            this.strainPeaks.push(this.currentSectionPeak);
        }
    }

    /**
     * Starts a new section to be checked.
     */
    startNewSectionFrom(offset: number): void {
        if (this.previous.length > 0) {
            this.currentSectionPeak = this.currentStrain * this.strainDecay(offset - this.previous[0].object.startTime);
        }
    }

    /**
     * Processes the hitobject.
     */
    process(currentObject: DifficultyHitObject): void {
        this.currentStrain *= this.strainDecay(currentObject.deltaTime);
        if (!(currentObject instanceof Spinner)) {
            this.currentStrain += this.strainValueOf(currentObject) * this.skillMultiplier;
            this.saveToHitObject(currentObject);
        }

        this.currentSectionPeak = Math.max(this.currentStrain, this.currentSectionPeak);
        this.addToHistory(currentObject);
    }

    /**
     * Calculates the difficulty value.
     */
    difficultyValue(): DifficultyValue {
        this.strainPeaks.sort((a, b) => {
            return b - a;
        });

        let difficulty: number = 0;
        let total: number = 0;
        let weight: number = 1;

        this.strainPeaks.forEach(strain => {
            total += Math.pow(strain, 1.2);
            difficulty += strain * weight;
            weight *= 0.9;
        });

        return {difficulty: difficulty, total: total};
    }

    /**
     * Calculates the strain value of the hitobject.
     */
    protected abstract strainValueOf(currentObject: DifficultyHitObject): number;

    /**
     * Saves the current strain to the hitobject.
     */
    protected abstract saveToHitObject(currentObject: DifficultyHitObject): void;
    /**
     * Calculates strain decay for a specified time frame.
     */
    private strainDecay(ms: number): number {
        return Math.pow(this.strainDecayBase, ms / 1000);
    }

    /**
     * Adds the hit object into history.
     */
    private addToHistory(currentObject: DifficultyHitObject): void {
        this.previous.unshift(currentObject);
        if (this.previous.length > 2) {
            this.previous.pop();
        }
    }
}