import { DatabasePPEntry } from "./DatabasePPEntry";

export interface BindDatabaseResponse {
    discordid: string;
    username: string;
    uid: string;
    pp: DatabasePPEntry[];
    pptotal: number;
}