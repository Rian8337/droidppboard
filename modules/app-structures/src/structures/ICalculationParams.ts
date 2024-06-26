export interface ICalculationParams {
    readonly beatmaplink?: string;
    readonly mods: string;
    readonly accuracy: number;
    readonly combo?: number;
    readonly misses: number;
    readonly speedmultiplier: number;
    readonly forcecs?: number;
    readonly forcear?: number;
    readonly forceod?: number;
}
