import { PPVariant } from "app-structures";
import { motion } from "framer-motion";
import { useContext, useEffect, useState } from "react";
import RecalcAddForm from "../components/recalc/RecalcAddForm";
import RecalcFullRunPanel from "../components/recalc/RecalcFullRunPanel";
import RecalcQueueList from "../components/recalc/RecalcQueueList";
import Head from "../components/Head";
import AuthContext from "../hooks/AuthContext";
import PrototypeSelectorNavigator from "../hooks/PrototypeSelectorNavigator";
import { useRecalcQueue } from "../hooks/useRecalcQueue";
import "../styles/recalc.css";

export default function PrototypeRecalcQueue() {
    const { user, isLoaded } = useContext(AuthContext);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            <Head
                description="Queue players for recalculation in a prototype variant of the osu!droid PP Project."
                title="PP Board - Recalculation Queue"
            />

            <h2 className="subtitle">Recalculation Queue</h2>

            {!isLoaded ? (
                <h3 className="description">Loading...</h3>
            ) : (
                // What a person can see depends on who they are, so nothing is kept across a
                // login or logout.
                <RecalcQueue
                    key={user?.uid ?? "visitor"}
                    user={
                        user ? { uid: user.uid, username: user.username } : null
                    }
                />
            )}
        </motion.div>
    );
}

function RecalcQueue(props: {
    user: { uid: number; username: string } | null;
}) {
    const prototypeSelectorCtx = useContext(PrototypeSelectorNavigator);
    const [chosenVariant, setChosenVariant] = useState<string | null>(null);
    const [showGlobal, setShowGlobal] = useState(false);
    const [variants, setVariants] = useState<readonly PPVariant[]>([]);

    // The variant list comes with the queue, so nothing is known about the variants until the
    // first response. Until a variant is selected, the global queue is loaded for that.
    const selected =
        variants.find((v) => v.name === chosenVariant)?.name ??
        variants.find(
            (v) => v.name === prototypeSelectorCtx.currentVariant?.name
        )?.name ??
        variants.at(0)?.name ??
        null;

    const requested = showGlobal ? null : selected;
    const { view, error, reload } = useRecalcQueue(requested);

    useEffect(() => {
        if (view) {
            setVariants(view.variants);
        }
    }, [view]);

    const variantLabel = (name: string) => {
        const variant = variants.find((v) => v.name === name);

        return variant?.title ?? variant?.name ?? name;
    };

    // The hook clears the view when the variant changes, but only after a render.
    const isShown =
        view !== null &&
        view.variant === requested &&
        (showGlobal || selected !== null);

    return (
        <div className="recalc-container">
            {error ? (
                <p role="alert" className="recalc-error">
                    {error}
                </p>
            ) : null}
            <div className="recalc-layout">
                <RecalcAddForm
                    variants={variants}
                    variant={selected}
                    onVariantChange={setChosenVariant}
                    user={props.user}
                    allowance={view?.allowance ?? null}
                    onQueued={reload}
                />
                <div className="recalc-main">
                    {isShown ? (
                        <>
                            <RecalcFullRunPanel
                                runs={view.fullRuns}
                                variant={requested}
                                canManage={view.canManageFullRuns}
                                variantLabel={variantLabel}
                                onChanged={reload}
                            />
                            <RecalcQueueList
                                view={view}
                                showGlobal={showGlobal}
                                onShowGlobalChange={setShowGlobal}
                                viewerUid={props.user?.uid}
                                variantLabel={variantLabel}
                                onChanged={reload}
                            />
                        </>
                    ) : error ? null : view?.variants.length === 0 ? (
                        <p className="recalc-center">
                            There are no variants to queue.
                        </p>
                    ) : (
                        <p className="recalc-center">Loading...</p>
                    )}
                </div>
            </div>
        </div>
    );
}
