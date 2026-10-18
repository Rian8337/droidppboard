import { faCheck, faCopy } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { Button } from "./Button";

export interface CopyButtonProps {
    text: string;
    label?: string;
}

const confirmationMs = 2000;

/** Copies `text` to the clipboard and briefly says so. A refused copy leaves the button as it was. */
export function CopyButton({ text, label = "Copy" }: CopyButtonProps) {
    const [hasCopied, setHasCopied] = useState(false);

    useEffect(() => {
        if (!hasCopied) {
            return;
        }

        const timer = setTimeout(() => setHasCopied(false), confirmationMs);

        return () => clearTimeout(timer);
    }, [hasCopied]);

    async function copyText() {
        try {
            await navigator.clipboard.writeText(text);
            setHasCopied(true);
        } catch {
            // The clipboard can be unavailable or denied; there is nothing useful to show.
        }
    }

    return (
        <Button variant="secondary" size="small" onClick={copyText}>
            <FontAwesomeIcon icon={hasCopied ? faCheck : faCopy} />
            {hasCopied ? "Copied" : label}
        </Button>
    );
}
