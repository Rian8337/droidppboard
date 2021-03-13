export interface WhitelistDatabaseResponse {
    mapid: number;
    mapname: string;
    diffstat: {
        cs: number;
        ar: number;
        od: number;
        hp: number;
        sr: number;
    };
}