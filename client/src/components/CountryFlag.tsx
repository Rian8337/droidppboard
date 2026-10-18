import styles from "./CountryFlag.module.css";

export interface CountryFlagProps {
    /** The ISO 3166-1 alpha-2 code of the country, such as `ID`. */
    code: string;
}

/** Turns a two-letter country code into its flag by way of the regional indicator symbols. */
function getFlagEmoji(code: string): string {
    return Array.from(code.toUpperCase(), (letter) =>
        String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65),
    ).join("");
}

/** A country's flag, or nothing when the code is not two letters. */
export function CountryFlag({ code }: CountryFlagProps) {
    if (!/^[a-z]{2}$/i.test(code)) {
        return null;
    }

    return (
        <span role="img" aria-label={code.toUpperCase()} className={styles.flag}>
            {getFlagEmoji(code)}
        </span>
    );
}
