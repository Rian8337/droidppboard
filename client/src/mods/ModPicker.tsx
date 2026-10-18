import {
    EnumModSetting,
    ModUtil,
    type Mod,
    type ModSetting,
    type SerializedMod,
} from "@rian8337/osu-base";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { deselectMod, getSelectableDroidMods, groupModsByCategory, selectMod } from "./droidMods";
import { matchesModSearch } from "./modSearch";
import { useFavoriteMods } from "./useFavoriteMods";
import styles from "./ModPicker.module.css";

export interface ModPickerProps {
    mods: readonly SerializedMod[];
    onChange: (mods: readonly SerializedMod[]) => void;

    /** Shows the settings of each selected mod below the picker. Defaults to true. */
    hasSettings?: boolean;
}

/**
 * The option list's height when there is ample room below the trigger. {@link MIN_PANEL_HEIGHT} is
 * the floor it does not shrink past even when the trigger sits close to the bottom of the
 * viewport: a handful of visibly scrollable rows beats an unusably tiny list. Between them, the
 * list adapts to the room that is actually free (see the layout effect in {@link ModPicker}) and
 * scrolls inside itself.
 */
const DEFAULT_PANEL_HEIGHT = 260;
const MIN_PANEL_HEIGHT = 120;
const VIEWPORT_MARGIN = 12;

/** The panel's widest size, as in ModPicker.module.css; used to keep it inside the viewport. */
const PANEL_WIDTH = 320;

/**
 * A "Select mods" dropdown listing every droid mod with a known icon (see `getSelectableDroidMods`)
 * as a checkbox row, grouped into the game's own mod-menu categories (see `groupModsByCategory`),
 * with the settings of each selected mod below it. A search box filters by acronym or name (see
 * `matchesModSearch`), and a star on each row favorites a mod into a section pinned above the
 * categories (see `useFavoriteMods`). Incompatible mods are deselected when a mod is selected (see
 * `selectMod`), so the selection is never an invalid combination.
 */
export function ModPicker({ mods, onChange, hasSettings = true }: ModPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
    const [isAlignedRight, setIsAlignedRight] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerWrapperRef = useRef<HTMLDivElement>(null);

    const { favorites, toggleFavorite } = useFavoriteMods();

    const selectable = useMemo(() => getSelectableDroidMods(), []);
    const visibleMods = useMemo(
        () => selectable.filter((mod) => matchesModSearch(mod, search)),
        [selectable, search],
    );
    const favoriteMods = useMemo(
        () => visibleMods.filter((mod) => favorites.has(mod.acronym)),
        [visibleMods, favorites],
    );
    const groups = useMemo(() => groupModsByCategory(visibleMods), [visibleMods]);
    const selected = useMemo(() => [...ModUtil.deserializeMods(mods).values()], [mods]);
    const selectedAcronyms = useMemo(() => new Set(selected.map((mod) => mod.acronym)), [selected]);

    function closePanel() {
        setIsOpen(false);
        setSearch("");
    }

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handlePointerDown(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                closePanel();
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                closePanel();
            }
        }

        document.addEventListener("mousedown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    // Fits the panel to the viewport: the option list stops at the bottom edge, and the panel
    // opens towards the left when it would run past the right edge. A layout effect (not a plain
    // one) so the corrected size applies before the browser paints the newly opened panel.
    useLayoutEffect(() => {
        if (!isOpen) {
            return;
        }

        function recomputeLayout() {
            const trigger = triggerWrapperRef.current;

            if (!trigger) {
                return;
            }

            const bounds = trigger.getBoundingClientRect();
            const availableHeight = window.innerHeight - bounds.bottom - VIEWPORT_MARGIN;

            setPanelHeight(
                Math.max(MIN_PANEL_HEIGHT, Math.min(DEFAULT_PANEL_HEIGHT, availableHeight)),
            );
            setIsAlignedRight(bounds.left + PANEL_WIDTH > window.innerWidth - VIEWPORT_MARGIN);
        }

        recomputeLayout();

        window.addEventListener("resize", recomputeLayout);

        return () => {
            window.removeEventListener("resize", recomputeLayout);
        };
    }, [isOpen]);

    function handleToggle(template: Mod) {
        if (selectedAcronyms.has(template.acronym)) {
            onChange(ModUtil.serializeMods(deselectMod(selected, template.acronym)));
            return;
        }

        const ModClass = template.constructor as new () => Mod;
        onChange(ModUtil.serializeMods(selectMod(selected, new ModClass())));
    }

    function handleSettingChange(modAcronym: string, settingIndex: number, value: unknown) {
        const next = selected.map((mod) => {
            if (mod.acronym !== modAcronym) {
                return mod;
            }

            // Cloned rather than mutated in place: `mod` belongs to `selected`, a memoized array,
            // so changing it directly would corrupt the memoized value without changing its
            // reference.
            const ModClass = mod.constructor as new () => Mod;
            const clone = new ModClass();

            clone.copySettings(mod.serialize());
            clone.settings[settingIndex].value = value;

            return clone;
        });

        onChange(ModUtil.serializeMods(next));
    }

    function renderModRow(mod: Mod) {
        const isFavorite = favorites.has(mod.acronym);

        return (
            <div key={mod.acronym} className={styles.option}>
                <label className={styles.optionLabel}>
                    <input
                        type="checkbox"
                        checked={selectedAcronyms.has(mod.acronym)}
                        onChange={() => {
                            handleToggle(mod);
                        }}
                    />
                    <img
                        className={styles.optionIcon}
                        src={`/icons/mods/${mod.acronym}.png`}
                        alt=""
                    />
                    <span className={styles.optionName}>{mod.name}</span>
                </label>
                <button
                    type="button"
                    className={styles.favoriteToggle}
                    aria-label={isFavorite ? `Unfavorite ${mod.name}` : `Favorite ${mod.name}`}
                    aria-pressed={isFavorite}
                    onClick={() => {
                        toggleFavorite(mod.acronym);
                    }}
                >
                    {isFavorite ? "★" : "☆"}
                </button>
            </div>
        );
    }

    function renderSetting(mod: Mod, setting: ModSetting<unknown>, index: number) {
        const inputId = `mod-setting-${mod.acronym}-${index.toString()}`;

        if (setting instanceof EnumModSetting) {
            return (
                <div key={inputId} className={styles.settingRow}>
                    <label className={styles.settingLabel} htmlFor={inputId}>
                        {setting.name}
                    </label>
                    <select
                        id={inputId}
                        className={styles.settingSelect}
                        value={setting.entries.indexOf(setting.value)}
                        onChange={(event) => {
                            const nextIndex = Number.parseInt(event.target.value, 10);

                            handleSettingChange(mod.acronym, index, setting.entries[nextIndex]);
                        }}
                    >
                        {setting.entries.map((entry, entryIndex) => (
                            <option key={entryIndex} value={entryIndex}>
                                {setting.formatValue(entry)}
                            </option>
                        ))}
                    </select>
                </div>
            );
        }

        if (typeof setting.value === "boolean") {
            return (
                <div key={inputId} className={styles.settingRow}>
                    <label className={styles.settingCheckboxLabel} htmlFor={inputId}>
                        <input
                            id={inputId}
                            type="checkbox"
                            checked={setting.value}
                            onChange={(event) => {
                                handleSettingChange(mod.acronym, index, event.target.checked);
                            }}
                        />
                        {setting.name}
                    </label>
                </div>
            );
        }

        // `null` means "no override" (Difficulty Adjust's CS/AR/OD/HP leave the beatmap's own
        // value untouched by default): an empty field hinting "Default", not the text "null".
        if (typeof setting.value === "number" || setting.value === null) {
            return (
                <div key={inputId} className={styles.settingRow}>
                    <label className={styles.settingLabel} htmlFor={inputId}>
                        {setting.name}
                    </label>
                    <input
                        id={inputId}
                        className={styles.settingInput}
                        type="number"
                        placeholder="Default"
                        value={setting.value ?? ""}
                        onChange={(event) => {
                            if (event.target.value === "") {
                                handleSettingChange(mod.acronym, index, null);
                                return;
                            }

                            const value = Number.parseFloat(event.target.value);

                            if (!Number.isNaN(value)) {
                                handleSettingChange(mod.acronym, index, value);
                            }
                        }}
                    />
                </div>
            );
        }

        // Every other setting type is text.
        if (typeof setting.value !== "string") {
            return null;
        }

        return (
            <div key={inputId} className={styles.settingRow}>
                <label className={styles.settingLabel} htmlFor={inputId}>
                    {setting.name}
                </label>
                <input
                    id={inputId}
                    className={styles.settingInput}
                    type="text"
                    value={setting.value}
                    onChange={(event) => {
                        handleSettingChange(mod.acronym, index, event.target.value);
                    }}
                />
            </div>
        );
    }

    const triggerLabel =
        selected.length > 0 ? selected.map((mod) => mod.acronym).join(", ") : "Select mods";

    return (
        <div className={styles.container} ref={containerRef}>
            <div className={styles.triggerWrapper} ref={triggerWrapperRef}>
                <button
                    type="button"
                    className={styles.trigger}
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    aria-label="Select mods"
                    onClick={() => (isOpen ? closePanel() : setIsOpen(true))}
                >
                    <span
                        className={[
                            styles.triggerText,
                            selected.length === 0 ? styles.placeholder : "",
                        ]
                            .filter(Boolean)
                            .join(" ")}
                    >
                        {triggerLabel}
                    </span>
                    <span className={styles.chevron} aria-hidden="true">
                        ▾
                    </span>
                </button>

                {isOpen ? (
                    <div className={styles.panel} data-align={isAlignedRight ? "right" : "left"}>
                        <input
                            type="search"
                            className={styles.search}
                            placeholder="Search mods..."
                            aria-label="Search mods"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                            }}
                        />

                        {visibleMods.length === 0 ? (
                            <p className={styles.empty}>No mods match your search.</p>
                        ) : (
                            <div
                                className={styles.optionList}
                                style={{ maxHeight: panelHeight }}
                                role="listbox"
                                aria-label="Mods"
                            >
                                {favoriteMods.length > 0 ? (
                                    <div className={styles.categoryGroup}>
                                        <div className={styles.categoryHeading}>Favorites</div>
                                        {favoriteMods.map(renderModRow)}
                                    </div>
                                ) : null}

                                {groups.map((group) => (
                                    <div key={group.category} className={styles.categoryGroup}>
                                        <div className={styles.categoryHeading}>
                                            {group.category}
                                        </div>
                                        {group.mods.map(renderModRow)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : null}
            </div>

            {hasSettings
                ? selected
                      .filter((mod) => mod.settings.length > 0)
                      .map((mod) => (
                          <div
                              key={mod.acronym}
                              className={styles.settingsList}
                              data-testid={`mod-settings-${mod.acronym}`}
                          >
                              <p className={styles.settingsHeading}>{mod.name} settings</p>
                              {mod.settings.map((setting, index) =>
                                  renderSetting(mod, setting, index),
                              )}
                          </div>
                      ))
                : null}
        </div>
    );
}
