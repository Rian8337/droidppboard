import { useId, useState, type ReactNode } from "react";
import { maxVariantDescriptionLength } from "../api/manage";
import { Markdown } from "../components/Markdown";
import { SegmentedControl } from "../components/SegmentedControl";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { getCollapsedDescription, isCollapsible } from "../variant/getCollapsedDescription";
import styles from "./DescriptionEditor.module.css";

export interface DescriptionEditorProps {
    value: string;
    onChange: (value: string) => void;
}

type Pane = "write" | "preview";

/**
 * Writes a variant's Markdown description. A desktop shows the text and its preview side by side; a phone or a tablet
 * switches between Write and Preview. The preview shows what is visible before "Show more" and the full description,
 * rendered as the variant page renders them.
 */
export function DescriptionEditor({ value, onChange }: DescriptionEditorProps) {
    const [pane, setPane] = useState<Pane>("write");
    const isDesktop = useBreakpoint() === "desktop";
    const textareaId = useId();
    const hasMore = isCollapsible(value);
    const isTooLong = value.length > maxVariantDescriptionLength;

    const writePane = (
        <div className={styles.write}>
            <label htmlFor={textareaId} className={styles.label}>
                Description
            </label>
            <textarea
                id={textareaId}
                className={styles.textarea}
                rows={10}
                maxLength={maxVariantDescriptionLength}
                value={value}
                onChange={(event) => onChange(event.target.value)}
            />
            <div className={styles.footer}>
                <a
                    href="https://commonmark.org/help/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.hint}
                >
                    Markdown supported
                </a>
                <span className={isTooLong ? styles.counterOver : styles.counter}>
                    {value.length} / {maxVariantDescriptionLength}
                </span>
            </div>
        </div>
    );

    const previewPane = (
        <div className={styles.preview}>
            <PreviewSection title="Before Show more">
                {value.trim() === "" ? (
                    <p className={styles.note}>Nothing to preview yet.</p>
                ) : hasMore ? (
                    <Markdown source={getCollapsedDescription(value)} />
                ) : (
                    <p className={styles.note}>Nothing is hidden: the whole description shows.</p>
                )}
            </PreviewSection>
            <PreviewSection title="Full description">
                {value.trim() === "" ? (
                    <p className={styles.note}>Nothing to preview yet.</p>
                ) : (
                    <Markdown source={value} />
                )}
            </PreviewSection>
        </div>
    );

    if (isDesktop) {
        return (
            <div className={styles.sideBySide}>
                {writePane}
                {previewPane}
            </div>
        );
    }

    return (
        <div className={styles.editor}>
            <SegmentedControl
                label="Description view"
                value={pane}
                onChange={setPane}
                options={[
                    { value: "write", label: "Write" },
                    { value: "preview", label: "Preview" },
                ]}
            />
            {pane === "write" ? writePane : previewPane}
        </div>
    );
}

function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
    const titleId = useId();

    return (
        <section aria-labelledby={titleId} className={styles.section}>
            <span id={titleId} className={styles.sectionTitle}>
                {title}
            </span>
            {children}
        </section>
    );
}
