import { RefObject, useCallback, useEffect, useRef, useState } from "react";

interface TurnstileRenderOptions {
    sitekey: string;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "error-callback": () => void;
}

declare global {
    interface Window {
        turnstile?: {
            render(
                container: HTMLElement,
                options: TurnstileRenderOptions
            ): string;
            reset(widgetId?: string): void;
            remove(widgetId?: string): void;
        };
    }
}

const scriptUrl =
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<void> | undefined;

/**
 * Loads the Turnstile script, injecting it into the document only once.
 */
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

/**
 * Renders a Turnstile widget into a container.
 *
 * @param siteKey The site key. If empty, no widget is rendered.
 * @param onToken Called with the token when the challenge is solved, or `null` when the token
 * is no longer valid.
 * @returns The container to attach to an element, a function to reset the widget (tokens are
 * single-use, so this must be called after every attempt that used one), and a load error, if any.
 */
export function useTurnstile(
    siteKey: string | undefined,
    onToken: (token: string | null) => void
): {
    containerRef: RefObject<HTMLDivElement>;
    reset: () => void;
    error: string | null;
} {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string>();
    const onTokenRef = useRef(onToken);
    const [error, setError] = useState<string | null>(null);

    onTokenRef.current = onToken;

    useEffect(() => {
        if (!siteKey) {
            return;
        }

        let cancelled = false;

        loadTurnstileScript()
            .then(() => {
                const container = containerRef.current;

                if (cancelled || !container || !window.turnstile) {
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
            .catch((e: Error) => {
                if (!cancelled) {
                    setError(e.message);
                }
            });

        return () => {
            cancelled = true;

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
