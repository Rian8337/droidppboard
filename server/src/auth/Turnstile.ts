const siteVerifyUrl =
    "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const requestTimeoutMs = 10_000;

let loggedMissingSecret = false;

/**
 * Verifies a Cloudflare Turnstile token.
 *
 * @param token The token that the client solved.
 * @param ip The IP of the client.
 * @returns Whether the token is valid. This is `false` if verification could not be done.
 */
export async function verifyTurnstile(
    token: string,
    ip: string,
): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET_KEY;

    if (!secret) {
        if (!loggedMissingSecret) {
            loggedMissingSecret = true;
            console.error(
                "TURNSTILE_SECRET_KEY is not set; Turnstile verification will always fail",
            );
        }

        return false;
    }

    try {
        const response = await fetch(siteVerifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                secret,
                response: token,
                remoteip: ip,
            }).toString(),
            signal: AbortSignal.timeout(requestTimeoutMs),
        });

        if (!response.ok) {
            return false;
        }

        const body = (await response.json()) as { success?: unknown };

        return body.success === true;
    } catch (e) {
        console.error("Turnstile verification failed", e);

        return false;
    }
}
