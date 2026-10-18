import { faCode } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { CalculationResponse, CalculationScope } from "app-structures";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCalculation } from "../api/calculator";
import { Button } from "../components/Button";
import { ErrorMessage } from "../components/ErrorMessage";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { CalculatorForm } from "./CalculatorForm";
import {
    canLoadFromResult,
    emptyFormValues,
    getFormValuesFromResult,
    type CalculatorFormValues,
} from "./calculatorForm";
import { ExportImageMenu } from "./ExportImageMenu";
import { RawResponseDialog } from "./RawResponseDialog";
import { ResultPanel } from "./ResultPanel";
import styles from "./CalculatorView.module.css";

export interface CalculatorViewProps {
    scope: CalculationScope;
    variant: string;

    /** Lets the person choose the variant, for the Beatmap calculator tool. */
    variantPicker?: ReactNode;

    /** What the form starts with, such as the values of a snapshot's result. */
    initialValues?: CalculatorFormValues;

    /**
     * Slot for the Generate link action, shown next to the other actions of the result panel. It
     * is given the result that is on show.
     */
    renderGenerateLink?: (response: CalculationResponse) => ReactNode;

    /**
     * Slot for the "Calculate my score" section, shown below the form. Its result shows in the
     * same result panel: call `showResult` with it.
     */
    renderMyScore?: (showResult: (response: CalculationResponse) => void) => ReactNode;
}

const missingBeatmapMessage = "Please enter a valid beatmap file, link or ID";

/** Makes text safe to use in a file name. */
function toFileNamePart(text: string): string {
    return text.replace(/[^\p{L}\p{N}.-]+/gu, "_");
}

function getImageFileName(response: CalculationResponse): string {
    return `${response.variant}-${toFileNamePart(String(response.beatmap.id ?? response.beatmap.title))}.png`;
}

/**
 * The calculator: a form to calculate an imaginary score and the result beside it (below it on a
 * tablet or phone, where the page scrolls to it after calculating).
 */
export function CalculatorView({
    scope,
    variant,
    variantPicker,
    initialValues = emptyFormValues,
    renderGenerateLink,
    renderMyScore,
}: CalculatorViewProps) {
    const breakpoint = useBreakpoint();
    const calculation = useCalculation(scope, variant);
    const [values, setValues] = useState(initialValues);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [result, setResult] = useState<CalculationResponse | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isRawResponseOpen, setIsRawResponseOpen] = useState(false);
    const resultRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLElement>(null);
    const scrolledResultRef = useRef<CalculationResponse | null>(null);

    useEffect(() => {
        if (result === null || result === scrolledResultRef.current) {
            return;
        }

        // Only a new result scrolls; turning the device must not.
        scrolledResultRef.current = result;

        if (breakpoint !== "desktop") {
            resultRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
        }
    }, [result, breakpoint]);

    function calculate() {
        if (!values.beatmapFile && values.beatmap.trim() === "") {
            setFormError(missingBeatmapMessage);

            return;
        }

        setFormError(null);
        calculation.mutate(values, { onSuccess: setResult });
    }

    function reset() {
        setValues(emptyFormValues);
        setFileInputKey((key) => key + 1);
        setFormError(null);
    }

    function loadFromResult() {
        if (!result) {
            return;
        }

        setValues(getFormValuesFromResult(result));
        setFileInputKey((key) => key + 1);
    }

    const error =
        formError ??
        (calculation.error
            ? calculation.error.retryAfterSeconds === undefined
                ? calculation.error.message
                : `${calculation.error.message}. Try again in ${calculation.error.retryAfterSeconds} seconds`
            : null);

    return (
        <div className={styles.view}>
            <div className={styles.inputs}>
                <CalculatorForm
                    values={values}
                    onChange={setValues}
                    onSubmit={calculate}
                    onReset={reset}
                    onLoadFromResult={loadFromResult}
                    canLoadFromResult={result !== null && canLoadFromResult(result)}
                    isCalculating={calculation.isPending}
                    fileInputKey={fileInputKey}
                    variantPicker={variantPicker}
                />
                {error !== null && <ErrorMessage message={error} />}
                {renderMyScore?.(setResult)}
            </div>
            <div ref={resultRef} className={styles.result}>
                {result ? (
                    <>
                        <div className={styles.actions}>
                            <Button variant="secondary" onClick={() => setIsRawResponseOpen(true)}>
                                <FontAwesomeIcon icon={faCode} />
                                Show raw response
                            </Button>
                            {renderGenerateLink?.(result)}
                            <ExportImageMenu
                                target={panelRef}
                                fileName={getImageFileName(result)}
                            />
                        </div>
                        <ResultPanel ref={panelRef} response={result} />
                        <RawResponseDialog
                            response={result}
                            isOpen={isRawResponseOpen}
                            onClose={() => setIsRawResponseOpen(false)}
                        />
                    </>
                ) : (
                    <p className={styles.placeholder}>
                        The result of the calculation shows up here.
                    </p>
                )}
            </div>
        </div>
    );
}
