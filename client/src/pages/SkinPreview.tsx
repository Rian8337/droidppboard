import { useEffect, useState } from "react";
import { IPlayerSkin } from "app-structures";
import { useParams } from "react-router";
import { motion } from "framer-motion";
import Head from "../components/Head";
import "../styles/input.css";
import SkinPreviewImage from "../components/skin/SkinPreviewImage";

export default function SkinPreview() {
    const { discordid: discordId, name } = useParams();
    const [data, setData] = useState<IPlayerSkin | null | undefined>(undefined);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(
        undefined
    );

    useEffect(() => {
        if (!discordId || !name) {
            setData(null);
            setErrorMessage("Invalid request.");

            return;
        }

        fetch(`/api/skins/get?discordid=${discordId}&name=${name}`)
            .then((res) => {
                if (res.status === 429) {
                    throw new Error(
                        "You are being rate limited. Please try again later"
                    );
                }

                if (!res.ok) {
                    throw new Error();
                }

                return res.json();
            })
            .then((rawData) => setData(rawData))
            .catch((e: Error) => {
                setData(null);
                setErrorMessage(e.message);
            });
    }, [discordId, name]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            {!data ? (
                <>
                    <Head description="A player's skin." title="Player Skin" />
                    <h2 className="subtitle">
                        {data === undefined
                            ? "Loading skin data..."
                            : "Skin not found!"}
                    </h2>
                    {errorMessage && (
                        <h3 className="error-message">
                            Error: {errorMessage}.
                        </h3>
                    )}
                </>
            ) : (
                <>
                    <Head
                        description="A player's skin."
                        title={`Player Skin - ${data.name}`}
                    />
                    <h2 className="subtitle">{data.name}</h2>
                    {data.description && (
                        <p className="subtitle">{data.description}</p>
                    )}
                    <input
                        type="submit"
                        className="submit-search"
                        value="Download"
                        style={{
                            margin: "0 auto",
                            display: "block",
                            width: "50%",
                        }}
                        onClick={() => window.open(data.url, "_blank")}
                    />
                    {data.previews && Object.keys(data.previews).length > 0 ? (
                        <>
                            <hr />
                            {data.previews.gameplay && (
                                <SkinPreviewImage
                                    src={data.previews.gameplay.attachmentURL}
                                    alt="Gameplay Preview"
                                />
                            )}
                            {data.previews.songSelection && (
                                <SkinPreviewImage
                                    src={
                                        data.previews.songSelection
                                            .attachmentURL
                                    }
                                    alt="Song Selection Preview"
                                />
                            )}
                            {data.previews.modSelection && (
                                <SkinPreviewImage
                                    src={
                                        data.previews.modSelection.attachmentURL
                                    }
                                    alt="Mod Selection Preview"
                                />
                            )}
                        </>
                    ) : (
                        <p className="subtitle">
                            This skin does not have a preview.
                        </p>
                    )}
                </>
            )}
        </motion.div>
    );
}
