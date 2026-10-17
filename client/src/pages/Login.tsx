import { motion } from "framer-motion";
import { FormEvent, useContext, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import Head from "../components/Head";
import AuthContext from "../hooks/AuthContext";
import { useTurnstile } from "../hooks/useTurnstile";
import "../styles/input.css";
import "../styles/login.css";

const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY;

/**
 * Obtains the path to go to after logging in, which is the page the user came from, if any.
 */
function getReturnPath(state: unknown): string {
    const from =
        typeof state === "object" && state !== null && "from" in state
            ? state.from
            : undefined;

    // Only allow paths on this site.
    if (
        typeof from === "string" &&
        from.startsWith("/") &&
        !from.startsWith("//") &&
        !from.startsWith("/login")
    ) {
        return from;
    }

    return "/";
}

export default function Login() {
    const authCtx = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [token, setToken] = useState<string | null>(null);
    const [isSubmitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | undefined>();
    const [retryAfter, setRetryAfter] = useState<number | undefined>();

    const turnstile = useTurnstile(siteKey, setToken);

    const returnPath = getReturnPath(location.state);
    const canSubmit =
        !!siteKey && !isSubmitting && !!token && !!username && !!password;

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        setSubmitting(true);
        setErrorMessage(undefined);
        setRetryAfter(undefined);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username,
                    password,
                    turnstileToken: token,
                }),
            });

            if (res.ok) {
                await authCtx.refresh();
                navigate(returnPath, { replace: true });

                return;
            }

            const body: unknown = await res.json().catch(() => null);
            const message =
                typeof body === "object" &&
                body !== null &&
                "message" in body &&
                typeof body.message === "string"
                    ? body.message
                    : "Login failed";

            setErrorMessage(message);

            if (res.status === 429) {
                const seconds = parseInt(res.headers.get("Retry-After") ?? "");

                if (Number.isFinite(seconds) && seconds > 0) {
                    // Keep the message a full sentence before the retry hint follows it.
                    setErrorMessage(
                        /[.!?]$/.test(message) ? message : `${message}.`
                    );
                    setRetryAfter(seconds);
                }
            }
        } catch {
            setErrorMessage("Unable to reach the server. Please try again");
        }

        // Tokens are single-use, so a new one is needed for the next attempt.
        setPassword("");
        turnstile.reset();
        setSubmitting(false);
    }

    // Someone who is already logged in has nothing to do here.
    if (authCtx.user) {
        return <Navigate to={returnPath} replace />;
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            <Head
                description="Log in to the osu!droid PP Project."
                title="PP Board - Login"
            />

            <h2 className="subtitle">Login</h2>

            <p className="description">Log in with your osu!droid account.</p>

            {siteKey ? (
                <form className="login-form" onSubmit={submit}>
                    <input
                        className="login-input"
                        type="text"
                        name="username"
                        placeholder="Username"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isSubmitting}
                    />
                    <input
                        className="login-input"
                        type="password"
                        name="password"
                        placeholder="Password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                    />
                    <div
                        className="login-captcha"
                        ref={turnstile.containerRef}
                    />
                    <button
                        className="login-submit"
                        type="submit"
                        disabled={!canSubmit}
                    >
                        {isSubmitting ? "Logging in..." : "Log in"}
                    </button>
                </form>
            ) : (
                <h3 className="error-message">Login is not configured.</h3>
            )}

            {errorMessage ? (
                <h3 className="error-message" role="alert">
                    {errorMessage}
                    {retryAfter !== undefined
                        ? ` Try again in ${retryAfter} second${
                              retryAfter === 1 ? "" : "s"
                          }.`
                        : null}
                </h3>
            ) : null}

            {turnstile.error ? (
                <h3 className="error-message">{turnstile.error}</h3>
            ) : null}
        </motion.div>
    );
}
