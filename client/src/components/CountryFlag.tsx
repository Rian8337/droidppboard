import styles from "./CountryFlag.module.css";

export interface CountryFlagProps {
    /** The ISO 3166-1 alpha-2 code of the country, such as `ID`; `null` when the country is unknown. */
    code: string | null;
}

/** The URL of each flag image, by the lowercase code of its country. The images are fetched only once they are shown. */
const flagUrls = Object.fromEntries(
    Object.entries(
        import.meta.glob<string>("/node_modules/flag-icons/flags/4x3/*.svg", {
            eager: true,
            query: "?no-inline",
            import: "default",
        }),
    ).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1, -".svg".length), url]),
);

const countryNames = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });

/** The English name of a country, or its code when there is no name for it. */
function getCountryName(code: string): string {
    return countryNames.of(code) ?? code;
}

/** A country's flag as an image, or nothing when the country is unknown or has no flag. */
export function CountryFlag({ code }: CountryFlagProps) {
    const url = code ? flagUrls[code.toLowerCase()] : undefined;

    if (!code || url === undefined) {
        return null;
    }

    return <img src={url} alt={getCountryName(code.toUpperCase())} className={styles.flag} />;
}
