import { faCode } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { CalculationResponse, CalculationScope } from "app-structures";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { useCalculation } from "../api/calculator";
import { formatApiError } from "../api/http";
import { Button } from "../components/Button";
import { ErrorMessage } from "../components/ErrorMessage";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { CalculatorForm } from "./CalculatorForm";
import {
    canLoadFromResult,
    emptyFormValues,
    getFormValuesFromResult,
    type CalculatorFormValues,
    type SubmittedCalculation,
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

    /** Gets the title that the result panel shows for a variant. Defaults to the variant's name. */
    getVariantTitle?: (variantName: string) => string;

    /**
     * Slot for the Generate link action, shown next to the other actions of the result panel. It
     * is given the result that is on show and what it was calculated from.
     */
    renderGenerateLink?: (
        response: CalculationResponse,
        submitted: SubmittedCalculation,
    ) => ReactNode;

    /**
     * Slot for the "Calculate my score" section, shown below the form. Its result shows in the
     * same result panel: call `showResult` with it and the values it was calculated from.
     */
    renderMyScore?: (
        showResult: (response: CalculationResponse, values: CalculatorFormValues) => void,
    ) => ReactNode;
}

const missingBeatmapMessage = "Please enter a valid beatmap file, link or ID";

/** The result on show, with what it was calculated from. */
interface ShownResult {
    response: CalculationResponse;
    submitted: SubmittedCalculation;

    /** Tells one result from the next, as two calculations can have equal responses. */
    number: number;
}

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
    getVariantTitle,
    renderGenerateLink,
    renderMyScore,
}: CalculatorViewProps) {
    const breakpoint = useBreakpoint();
    const calculation = useCalculation(scope, variant);
    const [values, setValues] = useState(initialValues);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [shown, setShown] = useState<ShownResult | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [isRawResponseOpen, setIsRawResponseOpen] = useState(false);
    const resultRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLElement>(null);
    const scrolledNumberRef = useRef<number | null>(null);
    const result = shown?.response ?? null;

    useEffect(() => {
        if (shown === null || shown.number === scrolledNumberRef.current) {
            return;
        }

        // Only a new result scrolls; turning the device must not.
        scrolledNumberRef.current = shown.number;

        if (breakpoint !== "desktop") {
            resultRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
        }
    }, [shown, breakpoint]);

    function showResult(response: CalculationResponse, submitted: SubmittedCalculation) {
        setShown((previous) => ({
            response,
            submitted,
            number: (previous?.number ?? 0) + 1,
        }));
    }

    function calculate() {
        if (!values.beatmapFile && values.beatmap.trim() === "") {
            setFormError(missingBeatmapMessage);

            return;
        }

        setFormError(null);
        calculation.mutate(values, {
            onSuccess: (response) => showResult(response, { values, isMyScore: false }),
        });
    }

    function reset() {
        setValues(emptyFormValues);
        setFileInputKey((key) => key + 1);
        setFormError(null);
        calculation.reset();
    }

    function loadFromResult() {
        if (!result) {
            return;
        }

        setValues(getFormValuesFromResult(result));
        setFileInputKey((key) => key + 1);
    }

    const error = formError ?? (calculation.error ? formatApiError(calculation.error) : null);

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
                {renderMyScore?.((response, myScoreValues) =>
                    showResult(response, { values: myScoreValues, isMyScore: true }),
                )}
            </div>
            <div ref={resultRef} className={styles.result}>
                {shown ? (
                    // A key per result, so that a link made for the previous one does not stay.
                    <Fragment key={shown.number}>
                        <div className={styles.actions}>
                            <Button variant="secondary" onClick={() => setIsRawResponseOpen(true)}>
                                <FontAwesomeIcon icon={faCode} />
                                Show raw response
                            </Button>
                            {renderGenerateLink?.(shown.response, shown.submitted)}
                            <ExportImageMenu
                                target={panelRef}
                                fileName={getImageFileName(shown.response)}
                            />
                        </div>
                        <ResultPanel
                            ref={panelRef}
                            response={shown.response}
                            title={getVariantTitle?.(shown.response.variant)}
                        />
                        <RawResponseDialog
                            response={shown.response}
                            isOpen={isRawResponseOpen}
                            onClose={() => setIsRawResponseOpen(false)}
                        />
                    </Fragment>
                ) : (
                    <p className={styles.placeholder}>
                        The result of the calculation shows up here.
                    </p>
                )}
            </div>
        </div>
    );
}
