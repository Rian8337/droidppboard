interface ImportMetaEnv {
    /** The Cloudflare Turnstile site key of the login captcha. Login is unavailable without it. */
    readonly VITE_TURNSTILE_SITE_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
