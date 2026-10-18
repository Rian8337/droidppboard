import type { CalculationResponse } from "app-structures";
import { CopyButton } from "../components/CopyButton";
import { Dialog } from "../components/Dialog";
import styles from "./RawResponseDialog.module.css";

export interface RawResponseDialogProps {
    response: CalculationResponse;
    isOpen: boolean;
    onClose: () => void;
}

/** The size in bytes of the data that a base64 string stands for. */
function getBase64Size(base64: string): number {
    const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;

    return Math.floor((base64.length * 3) / 4) - padding;
}

/**
 * The response as pretty-printed JSON for reading. A strain chart is thousands of characters of
 * base64 that nobody reads, so it is replaced by its size here; this changes only what is shown.
 */
function formatShownResponse(response: CalculationResponse): string {
    return JSON.stringify(
        response,
        (key, value: unknown) =>
            key === "strainChart" && typeof value === "string"
                ? `<base64 PNG, ${getBase64Size(value)} bytes>`
                : value,
        2,
    );
}

/** The raw JSON of a calculation, with a button to copy all of it, strain chart included. */
export function RawResponseDialog({ response, isOpen, onClose }: RawResponseDialogProps) {
    return (
        <Dialog title="Raw response" isOpen={isOpen} onClose={onClose}>
            <div className={styles.actions}>
                <CopyButton text={JSON.stringify(response, null, 2)} label="Copy to clipboard" />
            </div>
            <pre className={styles.json}>{formatShownResponse(response)}</pre>
        </Dialog>
    );
}
