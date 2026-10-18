import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useLocation, useMatch } from "react-router";
import { useVariants } from "../api/variants";
import { discordUrl } from "../utils/links";
import { findVariant } from "../variant/findVariant";
import { getVariantTitle } from "../variant/getVariantTitle";
import { AccountMenu } from "./AccountMenu";
import styles from "./TopBar.module.css";

export interface TopBarProps {
    isSidebarOpen: boolean;
    onToggleSidebar: () => void;
}

const pageNames: ReadonlyMap<string, string> = new Map([
    ["calculate", "Beatmap calculator"],
    ["whitelist", "Whitelist"],
    ["score-multiplier", "Score multiplier sample"],
    ["about", "About"],
    ["login", "Log in"],
    ["admin", "Admin"],
    ["skin", "Skins"],
    ["match_history", "Match history"],
]);

/** The top bar: the sidebar toggle, where the person is, Discord and the account. */
export function TopBar({ isSidebarOpen, onToggleSidebar }: TopBarProps) {
    const { pathname } = useLocation();
    const variantName = useMatch("/v/:variant/*")?.params.variant;
    const { data: variants } = useVariants();

    let title = "PP Board";
    let pageTitle: string | null = null;

    if (variantName !== undefined) {
        const variant = findVariant(variants, variantName);

        pageTitle = variant ? getVariantTitle(variant) : variantName;
        title = `PP Board · ${pageTitle}`;
    } else {
        pageTitle = pageNames.get(pathname.split("/")[1]) ?? null;
        title = pageTitle ?? title;
    }

    return (
        <header className={styles.topBar}>
            <title>{pageTitle === null ? "PP Board" : `${pageTitle} · PP Board`}</title>
            <button
                type="button"
                className={styles.toggle}
                aria-label={isSidebarOpen ? "Close menu" : "Open menu"}
                aria-expanded={isSidebarOpen}
                onClick={onToggleSidebar}
            >
                <FontAwesomeIcon icon={isSidebarOpen ? faXmark : faBars} />
            </button>
            <h1 className={styles.title}>{title}</h1>
            <a className={styles.discord} href={discordUrl} target="_blank" rel="noreferrer">
                Discord
            </a>
            <AccountMenu />
        </header>
    );
}
