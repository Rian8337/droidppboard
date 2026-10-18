import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

interface TurnstileRenderOptions {
    sitekey: string;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
}

declare global {
    interface Window {
        turnstile?: {
            render(container: HTMLElement, options: TurnstileRenderOptions): string;
            reset(widgetId?: string): void;
            remove(widgetId?: string): void;
        };
    }
}

const scriptUrl = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<void> | undefined;

/** Loads the Turnstile script, injecting it into the document only once. */
function loadTurnstileScript(): Promise<void> {
    if (window.turnstile) {
        return Promise.resolve();
    }

    if (!scriptPromise) {
        scriptPromise = new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");

            script.src = scriptUrl;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => {
                // Allow a later attempt to retry.
                scriptPromise = undefined;
                script.remove();
                reject(new Error("Failed to load the captcha"));
            };

            document.head.appendChild(script);
        });
    }

    return scriptPromise;
}

export interface Turnstile {
    /** Attach to the element the widget is drawn in. */
    readonly containerRef: RefObject<HTMLDivElement | null>;

    /**
     * Asks for a new challenge. Tokens are single-use, so call this after every attempt that used
     * one.
     */
    readonly reset: () => void;

    /** Why the captcha is not usable, if it is not. */
    readonly error: string | null;
}

/**
 * Draws a Cloudflare Turnstile widget in a container.
 *
 * @param siteKey The site key. If empty, no widget is drawn.
 * @param onToken Called with the token when the challenge is solved, or `null` when the token is
 * no longer valid.
 */
export function useTurnstile(
    siteKey: string | undefined,
    onToken: (token: string | null) => void,
): Turnstile {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const widgetIdRef = useRef<string | undefined>(undefined);
    const onTokenRef = useRef(onToken);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        onTokenRef.current = onToken;
    });

    useEffect(() => {
        if (!siteKey) {
            return;
        }

        let isCancelled = false;

        loadTurnstileScript()
            .then(() => {
                const container = containerRef.current;

                if (isCancelled || !container || !window.turnstile) {
                    return;
                }

                setError(null);

                widgetIdRef.current = window.turnstile.render(container, {
                    sitekey: siteKey,
                    callback: (token) => onTokenRef.current(token),
                    "expired-callback": () => onTokenRef.current(null),
                    "error-callback": () => {
                        onTokenRef.current(null);
                        setError("The captcha failed. Please try again later.");
                    },
                });
            })
            .catch((failure: Error) => {
                if (!isCancelled) {
                    setError(failure.message);
                }
            });

        return () => {
            isCancelled = true;

            if (widgetIdRef.current) {
                window.turnstile?.remove(widgetIdRef.current);
                widgetIdRef.current = undefined;
            }
        };
    }, [siteKey]);

    const reset = useCallback(() => {
        onTokenRef.current(null);

        if (widgetIdRef.current) {
            window.turnstile?.reset(widgetIdRef.current);
        }
    }, []);

    return { containerRef, reset, error };
}
