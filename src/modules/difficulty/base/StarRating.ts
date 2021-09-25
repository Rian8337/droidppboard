import { Beatmap } from '../../beatmap/Beatmap';
import { modes } from '../../constants/modes';
import { MapStats } from '../../utils/MapStats';
import { DifficultyHitObject } from '../preprocessing/DifficultyHitObject';
import { DifficultyHitObjectCreator } from '../preprocessing/DifficultyHitObjectCreator';
import { Skill } from './Skill';
import { Mod } from '../../mods/Mod';

/**
 * The base of difficulty calculation.
 */
export abstract class StarRating {
    /**
     * The calculated beatmap.
     */
    map: Beatmap = new Beatmap();

    /**
     * The difficulty objects of the beatmap.
     */
    readonly objects: DifficultyHitObject[] = [];

    /**
     * The modifications applied.
     */
    mods: Mod[] = [];

    /**
     * The total star rating of the beatmap.
     */
    total: number = 0;

    /**
     * The map statistics of the beatmap after modifications are applied.
     */
    stats: MapStats = new MapStats();

    /**
     * The strain peaks of aim difficulty.
     */
    aimStrainPeaks: number[] = [];

    /**
     * The strain peaks of speed difficulty.
     */
    speedStrainPeaks: number[] = [];

    /**
     * The strain peaks of flashlight difficulty.
     */
    flashlightStrainPeaks: number[] = [];

    protected readonly sectionLength: number = 400;
    protected abstract readonly difficultyMultiplier: number;

    /**
     * Calculates the star rating of the specified beatmap.
     * 
     * The beatmap is analyzed in chunks of `sectionLength` duration.
     * For each chunk the highest hitobject strains are added to
     * a list which is then collapsed into a weighted sum, much
     * like scores are weighted on a user's profile.
     * 
     * For subsequent chunks, the initial max strain is calculated
     * by decaying the previous hitobject's strain until the
     * beginning of the new chunk.
     * 
     * The first object doesn't generate a strain
     * so we begin calculating from the second object.
     * 
     * Also don't forget to manually add the peak strain for the last
     * section which would otherwise be ignored.
     */
    protected calculate(params: {
        /**
         * The beatmap to calculate.
         */
        map: Beatmap,

        /**
         * Applied modifications in osu!standard format.
         */
        mods?: Mod[],

        /**
         * Custom map statistics to apply custom speed multiplier as well as old statistics.
         */
        stats?: MapStats
    }, mode: modes): this {
        const map: Beatmap = this.map = params.map;
        if (!map) {
            throw new Error("A map must be defined");
        }

        const mod: Mod[] = this.mods = params.mods || this.mods;

        this.stats = new MapStats({
            cs: map.cs,
            ar: map.ar,
            od: map.od,
            hp: map.hp,
            mods: mod,
            speedMultiplier: params.stats?.speedMultiplier || 1,
            oldStatistics: params.stats?.oldStatistics || false
        }).calculate({mode: mode});

        this.generateDifficultyHitObjects(mode);
        this.calculateAll();

        return this;
    }

    /**
     * Generates difficulty hitobjects for this calculator.
     * 
     * @param mode The gamemode to generate difficulty hitobjects for.
     */
    generateDifficultyHitObjects(mode: modes): void {
        this.objects.length = 0;
        this.objects.push(...new DifficultyHitObjectCreator().generateDifficultyObjects({
            objects: this.map.objects,
            circleSize: <number> this.stats.cs,
            speedMultiplier: this.stats.speedMultiplier,
            mode: mode
        }));
    }

    /**
     * Calculates the skills provided.
     * 
     * @param skills The skills to calculate.
     */
    protected calculateSkills(...skills: Skill[]): void {
        this.objects.slice(1).forEach(h => {
            skills.forEach(skill => {
                skill.processInternal(h);
            });
        });
    }

    /**
     * Calculates the total star rating of the beatmap and stores it in this instance.
     */
    abstract calculateTotal(): void;

    /**
     * Calculates every star rating of the beatmap and stores it in this instance.
     */
    abstract calculateAll(): void;

    /**
     * Returns a string representative of the class.
     */
    abstract toString(): string;

    /**
     * Creates skills to be calculated.
     */
    protected abstract createSkills(): Skill[];
}