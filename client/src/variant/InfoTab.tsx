import type { PPVariant } from "app-structures";
import { Link } from "react-router";
import { getVariantPath } from "../routing/paths";
import { discordUrl } from "../utils/links";
import { formatUtcTime } from "../utils/formatUtcTime";
import styles from "./InfoTab.module.css";

export interface InfoTabProps {
    variant: PPVariant;
}

/** A variant's details, then help that reads the same for every variant. */
export function InfoTab({ variant }: InfoTabProps) {
    return (
        <div className={styles.info}>
            <dl className={styles.details}>
                <dt>Internal name</dt>
                <dd>{variant.name}</dd>
                {variant.aliases.length > 0 && (
                    <>
                        <dt>Aliases</dt>
                        <dd>{variant.aliases.join(", ")}</dd>
                    </>
                )}
                {variant.builtAt !== null && (
                    <>
                        <dt>Last updated</dt>
                        <dd>{formatUtcTime(variant.builtAt)}</dd>
                    </>
                )}
                {variant.calculatorVersion !== null && (
                    <>
                        <dt>Calculator version</dt>
                        <dd>{variant.calculatorVersion}</dd>
                    </>
                )}
                <dt>Availability</dt>
                <dd>{variant.available ? "Available" : "Unavailable"}</dd>
            </dl>
            <section className={styles.help}>
                <h2 className={styles.helpTitle}>How this works</h2>
                <ul>
                    <li>
                        Check the{" "}
                        <Link to={getVariantPath(variant.name, "leaderboard")}>
                            Leaderboard tab
                        </Link>{" "}
                        for your recalculated data.
                    </li>
                    <li>
                        If your data is outdated or you are missing, add yourself on the{" "}
                        <Link to={getVariantPath(variant.name, "queue")}>Queue tab</Link>.
                    </li>
                    <li>Most values shown are estimates.</li>
                    <li>
                        Found a bug? Report it on{" "}
                        <a href={discordUrl} target="_blank" rel="noreferrer">
                            Discord
                        </a>
                        .
                    </li>
                </ul>
            </section>
        </div>
    );
}
