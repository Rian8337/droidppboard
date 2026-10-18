import type { SkinPreviewData } from "app-structures";
import { useParams } from "react-router";
import { formatError } from "../api/http";
import { useSkin } from "../api/skins";
import { EmptyState } from "../components/EmptyState";
import { ErrorMessage } from "../components/ErrorMessage";
import { getSafeHttpUrl } from "../utils/getSafeHttpUrl";
import pageStyles from "./Page.module.css";
import styles from "./SkinPreviewPage.module.css";

const previewKinds = [
    ["gameplay", "Gameplay Preview"],
    ["songSelection", "Song Selection Preview"],
    ["modSelection", "Mod Selection Preview"],
] as const;

/** One skin: its description, where to download it and the previews that were uploaded. */
export function SkinPreviewPage() {
    const { discordid: discordId = "", name = "" } = useParams();
    const { data: skin, error, isPending, refetch } = useSkin(discordId, name);

    if (error) {
        return (
            <div className={pageStyles.page}>
                <ErrorMessage message={formatError(error)} onRetry={() => void refetch()} />
            </div>
        );
    }

    if (isPending) {
        return <p className={`${pageStyles.page} ${pageStyles.note}`}>Loading...</p>;
    }

    if (!skin) {
        return <EmptyState message="Skin not found" />;
    }

    // The previews are keyed by the values of the server's `SkinPreviewType`.
    const uploaded: Partial<Record<string, SkinPreviewData>> = skin.previews ?? {};
    const previews = previewKinds.flatMap(([kind, alt]) => {
        const preview = uploaded[kind];

        // Skins are stored as people shared them, so only web addresses are loaded.
        const source = preview ? getSafeHttpUrl(preview.attachmentURL) : undefined;

        return source ? [{ kind, alt, source }] : [];
    });
    const downloadUrl = getSafeHttpUrl(skin.url);

    return (
        <div className={`${pageStyles.page} ${pageStyles.narrow}`}>
            <h2 className={pageStyles.title}>{skin.name}</h2>
            {skin.description && <p className={styles.description}>{skin.description}</p>}
            {downloadUrl ? (
                <a
                    className={styles.download}
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Download
                </a>
            ) : (
                <p className={pageStyles.note}>No download available.</p>
            )}
            {previews.length > 0 ? (
                <div className={styles.previews}>
                    {previews.map(({ kind, alt, source }) => (
                        <img key={kind} className={styles.preview} src={source} alt={alt} />
                    ))}
                </div>
            ) : (
                <p className={pageStyles.note}>This skin does not have a preview.</p>
            )}
        </div>
    );
}
