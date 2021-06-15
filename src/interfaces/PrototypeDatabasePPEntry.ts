import { DatabasePPEntry } from "./DatabasePPEntry";

export interface PrototypeDatabasePPEntry extends DatabasePPEntry {
    prevPP: number;
}