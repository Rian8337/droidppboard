import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { useLogin, useMe } from "../api/auth";
import { ApiError } from "../api/http";
import { Button } from "../components/Button";
import { ErrorMessage } from "../components/ErrorMessage";
import { TextField } from "../components/TextField";
import { useTurnstile } from "../hooks/useTurnstile";
import styles from "./LoginPage.module.css";

/** The page to go to after logging in: the one the person came from, if it is on this site. */
function getReturnPath(state: unknown): string {
    const from =
        typeof state === "object" && state !== null && "from" in state ? state.from : undefined;

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

/** What to tell the person about a failed login; a throttled one says how long to wait. */
function formatLoginError(error: Error): string {
    if (!(error instanceof ApiError) || error.retryAfterSeconds === undefined) {
        return error.message;
    }

    const seconds = error.retryAfterSeconds;
    const sentence = /[.!?]$/.test(error.message) ? error.message : `${error.message}.`;

    return `${sentence} Try again in ${seconds} second${seconds === 1 ? "" : "s"}.`;
}

/** Logs in with an osu!droid account, then returns to the page the person came from. */
export function LoginPage() {
    const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    const { data: me } = useMe();
    const login = useLogin();
    const location = useLocation();
    const navigate = useNavigate();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [token, setToken] = useState<string | null>(null);
    const {
        containerRef,
        reset: resetCaptcha,
        error: captchaError,
    } = useTurnstile(siteKey, setToken);
    const returnPath = getReturnPath(location.state);
    const canSubmit =
        !!siteKey && !!token && username !== "" && password !== "" && !login.isPending;

    // Somebody who is logged in has nothing to do here.
    if (me) {
        return <Navigate to={returnPath} replace />;
    }

    function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (!canSubmit || token === null) {
            return;
        }

        login.mutate(
            { username, password, turnstileToken: token },
            {
                onSuccess: () => void navigate(returnPath, { replace: true }),
                onError: () => {
                    setPassword("");
                    // A token works once, so the next attempt needs a new challenge.
                    resetCaptcha();
                },
            },
        );
    }

    return (
        <div className={styles.wrapper}>
            <div className={styles.card}>
                <h2 className={styles.title}>Log in</h2>
                <p className={styles.lead}>Log in with your osu!droid account.</p>
                {siteKey ? (
                    <form className={styles.form} onSubmit={handleSubmit}>
                        <TextField
                            label="Username"
                            name="username"
                            autoComplete="username"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            disabled={login.isPending}
                        />
                        <TextField
                            label="Password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            disabled={login.isPending}
                        />
                        <div className={styles.captcha} ref={containerRef} />
                        <Button type="submit" disabled={!canSubmit}>
                            {login.isPending ? "Logging in..." : "Log in"}
                        </Button>
                    </form>
                ) : (
                    <p className={styles.error}>Login is not configured.</p>
                )}
                {login.error && <ErrorMessage message={formatLoginError(login.error)} />}
                {captchaError && <ErrorMessage message={captchaError} />}
            </div>
        </div>
    );
}
