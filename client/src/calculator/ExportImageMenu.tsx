import { faCopy, faDownload, faImage } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { toBlob, toPng } from "html-to-image";
import { useState, type RefObject } from "react";
import { Menu, type MenuItem } from "../components/Menu";
import styles from "./ExportImageMenu.module.css";

export interface ExportImageMenuProps {
    /** The element that the image is taken of. */
    target: RefObject<HTMLElement | null>;

    /** The name of the downloaded file, including `.png`. */
    fileName: string;
}

/** The panel's own colour, so that the image is not transparent. */
const imageOptions = { backgroundColor: "#313131", pixelRatio: 2 };

/** Whether the browser can put an image on the clipboard; not every one can. */
function canCopyImage(): boolean {
    return typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function";
}

/** A menu to copy the target element to the clipboard as a PNG (where the browser can) or download it. */
export function ExportImageMenu({ target, fileName }: ExportImageMenuProps) {
    const [status, setStatus] = useState<{ text: string; isError: boolean } | null>(null);

    async function copyImage() {
        const element = target.current;

        if (!element) {
            return;
        }

        try {
            // The blob is handed over as a promise so that Safari still counts this as the click's own action.
            await navigator.clipboard.write([
                new ClipboardItem({
                    "image/png": toBlob(element, imageOptions).then((blob) => {
                        if (blob === null) {
                            throw new Error("No image was made");
                        }

                        return blob;
                    }),
                }),
            ]);
            setStatus({ text: "Copied to clipboard", isError: false });
        } catch {
            setStatus({ text: "Could not copy the image", isError: true });
        }
    }

    async function downloadImage() {
        const element = target.current;

        if (!element) {
            return;
        }

        try {
            const link = document.createElement("a");

            link.download = fileName;
            link.href = await toPng(element, imageOptions);
            link.click();
            setStatus(null);
        } catch {
            setStatus({ text: "Could not make the image", isError: true });
        }
    }

    const items: MenuItem[] = [];

    if (canCopyImage()) {
        items.push({
            label: "Copy to clipboard",
            icon: <FontAwesomeIcon icon={faCopy} fixedWidth />,
            keepOpen: true,
            onSelect: () => void copyImage(),
        });
    }

    items.push({
        label: "Download PNG",
        icon: <FontAwesomeIcon icon={faDownload} fixedWidth />,
        onSelect: () => void downloadImage(),
    });

    return (
        <Menu
            trigger={
                <>
                    <FontAwesomeIcon icon={faImage} /> Export as image
                </>
            }
            items={items}
            onOpen={() => setStatus(null)}
            footer={
                status && (
                    <p
                        role={status.isError ? "alert" : "status"}
                        className={status.isError ? styles.error : styles.status}
                    >
                        {status.text}
                    </p>
                )
            }
        />
    );
}
