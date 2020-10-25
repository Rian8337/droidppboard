/**
 * A namespace containing bitwise constant of mods in both osu!droid and osu!standard as well as conversion methods.
 */
export namespace mods {
    /**
     * Mods in osu!droid.
     */
    export enum droidMods {
        "-" = 0,
        /**
         * No Fail.
         */
        n = 1 << 0,

        /**
         * Easy.
         */
        e = 1 << 1,

        /**
         * Hidden.
         */
        h = 1 << 3,

        /**
         * Hard Rock.
         */
        r = 1 << 4,

        /**
         * Sudden Death.
         */
        u = 1 << 5,

        /**
         * Double Time.
         */
        d = 1 << 6,

        /**
         * Half Time.
         */
        t = 1 << 8,

        /**
         * Nightcore.
         */
        c = 1 << 9,

        /**
         * Perfect.
         */
        f = 1 << 14,

        /**
         * ScoreV2.
         */
        v = 1 << 29
    }

    /**
     * Mods in osu!standard.
     */
    export enum osuMods {
        nomod = 0,
        nf = 1<<0,
        ez = 1<<1,
        td = 1<<2,
        hd = 1<<3,
        hr = 1<<4,
        sd = 1<<5,
        dt = 1<<6,
        rx = 1<<7,
        ht = 1<<8,
        nc = 1<<9,
        fl = 1<<10,
        so = 1<<12,
        ap = 1<<13,
        pf = 1<<14,
        v2 = 1<<29,
        speed_changing = dt | ht | nc,
        map_changing = ez | hr | speed_changing,
        unranked = rx | ap | v2
    }

    /**
     * Converts droid mod string to modbits.
     */
    export function droidToModbits(mod: string = ""): number {
        let modbits: number = 4;
        if (!mod || mod === "-") {
            return modbits;
        }

        mod = mod.toLowerCase();
        while (mod) {
            for (const modEntry in droidMods) {
                const entry = modEntry as keyof typeof droidMods;
                if (mod.startsWith(entry)) {
                    modbits |= droidMods[entry];
                    break;
                }
            }
            mod = mod.substr(1);
        }
        return modbits;
    }

    /**
     * Converts droid mod string to PC mod string.
     * 
     * You can choose to return a detailed string by specifying `detailed = true`.
     */
    export function droidToPC(mod: string = "", detailed: boolean = false): string {
        if (!mod) {
            return "";
        }
        mod = mod.toLowerCase();
        
        if (detailed) {
            let res: string = '';
            let count: number = 0;
            if (mod.includes("-")) {
                res += 'None ';
                count++;
            };
            if (mod.includes("n")) {
                res += 'NoFail ';
                count++;
            }
            if (mod.includes("e")) {
                res += 'Easy ';
                count++;
            }
            if (mod.includes("t")) {
                res += 'HalfTime ';
                count++;
            }
            if (mod.includes("h")) {
                res += 'Hidden ';
                count++;
            }
            if (mod.includes("d")) {
                res += 'DoubleTime ';
                count++;
            }
            if (mod.includes("r")) {
                res += 'HardRock ';
                count++;
            }
            if (mod.includes("c")) {
                res += 'NightCore ';
                count++;
            }
            if (mod.includes("s")) {
                res += 'Precise ';
                count++;
            }
            if (mod.includes("m")) {
                res += 'SmallCircle ';
                count++;
            }
            if (mod.includes("b")) {
                res += 'SpeedUp';
                count++;
            }
            if (mod.includes("l")) {
                res += 'ReallyEasy ';
                count++;
            }
            if (mod.includes("f")) {
                res += 'Perfect ';
                count++;
            }
            if (mod.includes("u")) {
                res += 'SuddenDeath ';
                count++;
            }
            if (mod.includes("v")) {
                res += 'ScoreV2 ';
                count++;
            }
            if (count > 1) {
                return res.trim().split(" ").join(", ");
            } else {
                return res.trim();
            }
        }

        let modbits = 0;
        while (mod) {
            for (const modEntry in droidMods) {
                const entry = modEntry as keyof typeof droidMods;
                if (mod.startsWith(entry)) {
                    modbits |= droidMods[entry];
                    break;
                }
            }
            mod = mod.substr(1);
        }
        let modstring: string = modbitsToString(modbits);
        if (mod.includes("s")) {
            modstring += "PR";
        }
        if (mod.includes("b")) {
            modstring += "SU";
        }
        if (mod.includes("l")) {
            modstring += "RE";
        }
        if (mod.includes("m")) {
            modstring += "SC";
        }
        return modstring;
    }

    /**
     * Converts PC mods to a detailed string.
     */
    export function pcToDetail(mod: string = ""): string {
        let res = '';
        if (!mod) return 'None';
        mod = mod.toLowerCase();
        let count = 0;
        if (mod.includes("nf")) {
            res += 'NoFail ';
            count++;
        }
        if (mod.includes("ez")) {
            res += 'Easy ';
            count++;
        }
        if (mod.includes("ht")) {
            res += 'HalfTime ';
            count++;
        }
        if (mod.includes("td")) {
            res += 'TouchDevice ';
            count++;
        }
        if (mod.includes("hd")) {
            res += 'Hidden ';
            count++;
        }
        if (mod.includes("dt")) {
            res += 'DoubleTime ';
            count++;
        }
        if (mod.includes("hr")) {
            res += 'HardRock ';
            count++;
        }
        if (mod.includes("nc")) {
            res += 'NightCore ';
            count++;
        }
        if (mod.includes("pf")) {
            res += 'Perfect ';
            count++;
        }
        if (mod.includes("so")) {
            res += 'SpunOut ';
            count++;
        }
        if (mod.includes('v2')) {
            res += 'ScoreV2 ';
            count++;
        }
        if (count > 1) {
            return res.trim().split(" ").join(", ");
        } else {
            return res.trim();
        }
    }

    /**
     * Converts an osu!standard mod string into modbits.
     */
    export function modbitsFromString(str: string = ""): number {
        let mask: number = 0;
        str = str.toLowerCase();
        while (str) {
            let nchars: number = 1;
            for (const modEntry in osuMods) {
                const entry = modEntry as keyof typeof osuMods;
                if (entry.length !== 2) {
                    continue;
                }
                if (str.startsWith(entry)) {
                    mask |= osuMods[entry];
                    nchars = 2;
                    break;
                }
            }
            str = str.slice(nchars);
        }
        return mask;
    }

    /**
     * Converts mods bitwise into a string, such as "HDHR".
     */
    export function modbitsToString(mod: number = 0): string {
        let res: string = "";
        for (const modEntry in osuMods) {
            const entry = modEntry as keyof typeof osuMods;
            if (entry.length !== 2) {
                continue;
            }
            if (mod & osuMods[entry]) {
                res += entry.toUpperCase();
            }
        }
        if (res.indexOf("DT") >= 0 && res.indexOf("NC") >= 0) {
            res = res.replace("DT", "");
        }
        if (res.indexOf("SD") >= 0 && res.indexOf("PF") >= 0) {
            res = res.replace("SD", "");
        }
        return res;
    }
}