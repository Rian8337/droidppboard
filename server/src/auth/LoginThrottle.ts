const second = 1000;
const minute = 60 * second;

const freeUsernameFailures = 3;
const baseDelaySeconds = 2;
const maxDelaySeconds = 15 * 60;
const usernameResetMs = 60 * minute;

const ipWindowMs = 15 * minute;
const maxIpAttempts = 10;

const globalWindowMs = 5 * minute;
const globalFailureLimit = 100;
const globalBlockMs = 5 * minute;

interface UsernameState {
    failures: number;
    lastFailureAt: number;
}

export type LoginThrottleResult =
    | { allowed: true }
    | { allowed: false; retryAfterSeconds: number };

/**
 * Limits login attempts per username, per IP, and globally, in memory.
 */
export class LoginThrottle {
    private readonly usernames = new Map<string, UsernameState>();
    private readonly ipAttempts = new Map<string, number[]>();
    private globalFailures: number[] = [];
    private globalBlockedUntil = 0;

    /**
     * @param now Gets the current time in milliseconds.
     */
    constructor(private readonly now: () => number) {}

    /**
     * Checks whether a login attempt may proceed. An allowed attempt is counted against the IP;
     * a refused one is not.
     *
     * @param ip The IP of the request.
     * @param username The username that is being logged in to.
     * @returns Whether the attempt is allowed, or how long to wait if it is not.
     */
    check(ip: string, username: string): LoginThrottleResult {
        const now = this.now();

        this.prune(now);

        const retryAfterMs: number[] = [];

        if (now < this.globalBlockedUntil) {
            retryAfterMs.push(this.globalBlockedUntil - now);
        }

        const state = this.usernames.get(this.normalize(username));

        if (state && state.failures >= freeUsernameFailures) {
            const delayMs = this.delaySeconds(state.failures) * second;
            const remaining = state.lastFailureAt + delayMs - now;

            if (remaining > 0) {
                retryAfterMs.push(remaining);
            }
        }

        const attempts = this.ipAttempts.get(ip) ?? [];

        if (attempts.length >= maxIpAttempts) {
            retryAfterMs.push(attempts[0] + ipWindowMs - now);
        }

        if (retryAfterMs.length > 0) {
            return {
                allowed: false,
                retryAfterSeconds: Math.max(
                    1,
                    Math.ceil(Math.max(...retryAfterMs) / second),
                ),
            };
        }

        attempts.push(now);
        this.ipAttempts.set(ip, attempts);

        return { allowed: true };
    }

    /**
     * Records a failed login.
     *
     * @param ip The IP of the request.
     * @param username The username that was logged in to.
     */
    recordFailure(ip: string, username: string): void {
        const now = this.now();
        const key = this.normalize(username);

        this.prune(now);

        const state = this.usernames.get(key);

        this.usernames.set(key, {
            failures: (state?.failures ?? 0) + 1,
            lastFailureAt: now,
        });

        this.globalFailures.push(now);

        if (
            now >= this.globalBlockedUntil &&
            this.globalFailures.length > globalFailureLimit
        ) {
            this.globalBlockedUntil = now + globalBlockMs;
            this.globalFailures = [];
        }
    }

    /**
     * Records a successful login, which clears the failures of the username.
     *
     * @param username The username that was logged in to.
     */
    recordSuccess(username: string): void {
        this.usernames.delete(this.normalize(username));
    }

    private normalize(username: string): string {
        return username.toLowerCase();
    }

    private delaySeconds(failures: number): number {
        const exponent = failures - freeUsernameFailures;

        // Avoids overflowing for absurd failure counts.
        if (exponent >= 30) {
            return maxDelaySeconds;
        }

        return Math.min(baseDelaySeconds * 2 ** exponent, maxDelaySeconds);
    }

    private prune(now: number): void {
        for (const [key, state] of this.usernames) {
            if (now - state.lastFailureAt >= usernameResetMs) {
                this.usernames.delete(key);
            }
        }

        for (const [ip, attempts] of this.ipAttempts) {
            const recent = attempts.filter((t) => now - t < ipWindowMs);

            if (recent.length === 0) {
                this.ipAttempts.delete(ip);
            } else if (recent.length !== attempts.length) {
                this.ipAttempts.set(ip, recent);
            }
        }

        this.globalFailures = this.globalFailures.filter(
            (t) => now - t < globalWindowMs,
        );
    }
}
