import { Accuracy } from './utils/Accuracy';
import { Aim } from './difficulty/skills/Aim';
import { Beatmap } from './beatmap/Beatmap';
import { BreakPoint } from './beatmap/timings/BreakPoint';
import { Circle } from './beatmap/hitobjects/Circle';
import { DifficultyHitObject } from './beatmap/hitobjects/DifficultyHitObject';
import { DifficultyHitObjectCreator } from './difficulty/preprocessing/DifficultyHitObjectCreator';
import { DroidHitWindow, OsuHitWindow } from './utils/HitWindow';
import { HeadCircle } from './beatmap/hitobjects/sliderObjects/HeadCircle';
import { HitObject } from './beatmap/hitobjects/HitObject';
import { MapStars } from './tools/MapStars';
import { MapStats } from './utils/MapStats';
import { modes } from './constants/modes';
import { mods } from './utils/mods';
import { movementType } from './constants/movementType';
import { objectTypes } from './constants/objectTypes';
import { Parser } from './beatmap/Parser';
import { PathApproximator } from './utils/PathApproximator';
import { PathType } from './constants/PathType';
import { Precision } from './utils/Precision';
import { PerformanceCalculator } from './difficulty/PerformanceCalculator';
import { RepeatPoint } from './beatmap/hitobjects/sliderObjects/RepeatPoint';
import { Skill } from './difficulty/skills/Skill';
import { Slider } from './beatmap/hitobjects/Slider';
import { SliderPath } from './utils/SliderPath';
import { SliderTick } from './beatmap/hitobjects/sliderObjects/SliderTick';
import { Speed } from './difficulty/skills/Speed';
import { Spinner } from './beatmap/hitobjects/Spinner';
import { StarRating } from './difficulty/StarRating';
import { TailCircle } from './beatmap/hitobjects/sliderObjects/TailCircle';
import { TimingPoint } from './beatmap/timings/TimingPoint';
import { Vector2 } from './mathutil/Vector2';

export = {
    /**
     * An accuracy calculator that calculates accuracy based on given parameters.
     */
    Accuracy: Accuracy,

    /**
     * Represents the skill required to correctly aim at every object in the map with a uniform CircleSize and normalized distances.
     */
    Aim: Aim,

    /**
     * Represents a beatmap with advanced information.
     */
    Beatmap: Beatmap,

    /**
     * Represents a break period in a beatmap.
     */
    BreakPoint: BreakPoint,

    /**
     * Represents a circle in a beatmap.
     * 
     * All we need from circles is their position. All positions
     * stored in the objects are in playfield coordinates (512*384
     * rectangle).
     */
    Circle: Circle,

    /**
     * Represents an osu!standard hit object with difficulty calculation values.
     */
    DifficultyHitObject: DifficultyHitObject, 
    
    /**
     * A converter used to convert normal hitobjects into difficulty hitobjects.
     */
    DifficultyHitObjectCreator: DifficultyHitObjectCreator,

    /**
     * Represents the hit window of osu!droid.
     */
    DroidHitWindow: DroidHitWindow,

    /**
     * Represents the headcircle of a slider (sliderhead).
     */
    HeadCircle: HeadCircle,

    /**
     * Represents a hitobject in a beatmap.
     */
    HitObject: HitObject,

    /**
     * A star rating calculator that configures which mode to calculate difficulty for and what mods are applied.
     */
    MapStars: MapStars,

    /**
     * Holds general beatmap statistics for further modifications. 
     */
    MapStats: MapStats,

    /**
     * Mode enum to switch things between osu!droid and osu!standard.
     */
    modes: modes,

    /**
     * A namespace containing bitwise constant of mods in both osu!droid and osu!standard as well as conversion methods.
     */
    mods: mods,

    /**
     * Movement type of a cursor in an osu!droid replay.
     */
    movementType: movementType,

    /**
     * Represents the hit window of osu!standard.
     */
    OsuHitWindow: OsuHitWindow,

    /**
     * Bitmask constant of object types. This is needed as osu! uses bits to determine object types.
     */
    objectTypes: objectTypes,

    /**
     * A beatmap parser with just enough data for pp calculation.
     */
    Parser: Parser,

    /**
     * Path approximator for sliders.
     */
    PathApproximator: PathApproximator,

    /**
     * Types of slider paths.
     */
    PathType: PathType,

    /**
     * Precision utilities.
     */
    Precision: Precision,

    /**
     * A performance points calculator that calculates performance points for osu!standard gamemode.
     */
    PerformanceCalculator: PerformanceCalculator,

    /**
     * Represents a repeat point in a slider.
     */
    RepeatPoint: RepeatPoint,

    /**
     * Base class for skill aspects.
     */
    Skill: Skill,

    /**
     * Represents a slider in a beatmap.
     */
    Slider: Slider,

    /**
     * Represents a slider's path.
     */
    SliderPath: SliderPath,

    /**
     * Represents a slider tick in a slider.
     */
    SliderTick: SliderTick,

    /**
     * Represents the skill required to press keys or tap with regards to keeping up with the speed at which objects need to be hit.
     */
    Speed: Speed,

    /**
     * Represents a spinner in a beatmap.
     * 
     * All we need from spinners is their duration. The
     * position of a spinner is always at 256x192.
     */
    Spinner: Spinner,
    
    /**
     * An osu!standard difficulty calculator.
     */
    StarRating: StarRating,
    
    /**
     * Represents the tailcircle of a slider (sliderend).
     */
    TailCircle: TailCircle,

    /**
     * Represents a timing point in a beatmap.
     */
    TimingPoint: TimingPoint,

    /**
     * Based on `Vector2` class in C#.
     */
    Vector2: Vector2,
};