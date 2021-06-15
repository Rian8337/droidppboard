import { PrototypeDatabasePPEntry } from "./PrototypeDatabasePPEntry";

export interface PrototypeDatabaseResponse {
    discordid: string;
    username: string;
    uid: string;
    pp: PrototypeDatabasePPEntry[];
    pptotal: number;

    lastUpdate: number;
}