import {
    faCalculator,
    faClipboardList,
    faHeart,
    faMagnifyingGlass,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { Link, useMatch } from "react-router";
import { TextField } from "../components/TextField";
import styles from "./Sidebar.module.css";
import { VariantList } from "./VariantList";

export interface SidebarProps {
    /** Called when a link is picked, so that a drawer can close. */
    onNavigate: () => void;
}

const currentYear = new Date().getFullYear();
const issueTrackerUrl = "https://github.com/Rian8337/droidppboard/issues";

const tools = [
    { label: "Beatmap calculator", to: "/calculate", icon: faCalculator },
    { label: "Whitelist", to: "/whitelist", icon: faClipboardList },
    { label: "Score multiplier sample", to: "/score-multiplier", icon: faXmark },
];

/** The variants to pick from, the tools, and where to donate. */
export function Sidebar({ onNavigate }: SidebarProps) {
    const [filter, setFilter] = useState("");
    const currentVariant = useMatch("/v/:variant/*")?.params.variant;

    return (
        <aside className={styles.sidebar} aria-label="Sidebar">
            <p className={styles.version}>
                Version {__APP_VERSION__} ·{" "}
                <a href={issueTrackerUrl} target="_blank" rel="noreferrer">
                    Issue tracker
                </a>
            </p>
            <TextField
                type="search"
                className={styles.search}
                aria-label="Search reworks"
                placeholder="Search reworks"
                icon={<FontAwesomeIcon icon={faMagnifyingGlass} />}
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
            />
            <div className={styles.variants}>
                <VariantList
                    filter={filter}
                    currentVariant={currentVariant}
                    onNavigate={onNavigate}
                />
            </div>
            <nav className={styles.tools} aria-label="Tools">
                {tools.map((tool) => (
                    <Link key={tool.to} to={tool.to} className={styles.tool} onClick={onNavigate}>
                        <FontAwesomeIcon icon={tool.icon} fixedWidth />
                        {tool.label}
                    </Link>
                ))}
            </nav>
            <Link to="/about" className={styles.donate} onClick={onNavigate}>
                <FontAwesomeIcon icon={faHeart} fixedWidth />
                <span>
                    Donate &lt;3<small>Support the website</small>
                </span>
            </Link>
            <p className={styles.credit}>osu!droid PP Project Site · © {currentYear} Rian8337</p>
        </aside>
    );
}
