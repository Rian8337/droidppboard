import { ModMultiplierSampleEntry } from "./ModMultiplierSampleEntry";

export interface ModMultiplierSampleResponse {
    readonly beatmapTitle: string;
    readonly hash: string;
    readonly scores: ModMultiplierSampleEntry[];
}
