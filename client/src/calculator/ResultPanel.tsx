import type { CalculationResponse } from "app-structures";
import type { Ref } from "react";
import { getResultSections } from "./resultFields";
import { StrainGraph } from "./StrainGraph";
import styles from "./ResultPanel.module.css";

export interface ResultPanelProps {
    response: CalculationResponse;

    /** The panel's element, which Export as image takes a picture of. */
    ref?: Ref<HTMLElement>;
}

/** The result of a calculation as read-only text in groups, followed by the strain graph. */
export function ResultPanel({ response, ref }: ResultPanelProps) {
    const [header, ...sections] = getResultSections(response);

    return (
        <article ref={ref} className={styles.panel} aria-label="Calculation result">
            <header className={styles.header}>
                <h3 className={styles.title}>{header.title}</h3>
                <dl className={styles.headerFields}>
                    {header.fields.map((field) => (
                        <div key={field.label} className={styles.headerField}>
                            <dt>{field.label}</dt>
                            <dd>{field.value}</dd>
                        </div>
                    ))}
                </dl>
            </header>
            {sections.map((section) => (
                <section key={section.title} className={styles.section}>
                    <h4 className={styles.sectionTitle}>{section.title}</h4>
                    <dl className={styles.fields}>
                        {section.fields.map((field) => (
                            <div key={field.label} className={styles.field}>
                                <dt className={styles.label}>{field.label}</dt>
                                <dd
                                    className={
                                        field.tone
                                            ? `${styles.value} ${styles[field.tone]}`
                                            : styles.value
                                    }
                                >
                                    {field.value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>
            ))}
            <StrainGraph chart={response.result.strainChart} />
        </article>
    );
}
