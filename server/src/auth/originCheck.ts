import { RequestHandler } from "express";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Creates a middleware that refuses requests that change state unless they come from an allowed
 * origin. A request without an `Origin` header is refused too.
 *
 * @param allowed The allowed origins.
 * @returns The middleware.
 */
export function requireAllowedOrigin(allowed: string[]): RequestHandler {
    return (req, res, next) => {
        if (safeMethods.has(req.method)) {
            next();

            return;
        }

        const origin = req.get("Origin");

        if (origin === undefined || !allowed.includes(origin)) {
            res.status(403).json({ message: "Forbidden" });

            return;
        }

        next();
    };
}
