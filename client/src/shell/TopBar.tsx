import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useLocation, useMatch } from "react-router";
import { useVariants } from "../api/variants";
import { AccountMenu } from "./AccountMenu";
import styles from "./TopBar.module.css";

export interface TopBarProps {
    isSidebarOpen: boolean;
    onToggleSidebar: () => void;
}

const discordUrl = "https://discord.gg/nyD92cE";

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

    if (variantName !== undefined) {
        const variant = variants?.find((candidate) => candidate.name === variantName);

        title = `PP Board · ${variant?.title ?? variantName}`;
    } else {
        title = pageNames.get(pathname.split("/")[1]) ?? title;
    }

    return (
        <header className={styles.topBar}>
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
