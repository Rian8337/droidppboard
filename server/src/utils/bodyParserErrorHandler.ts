import { ErrorRequestHandler } from "express";

/**
 * Answers errors of the body parsers without logging them. The message of a parse error quotes a
 * part of the body, which may hold secrets such as passwords, so nothing derived from the error
 * is logged. Other errors are passed on.
 */
export const bodyParserErrorHandler: ErrorRequestHandler = (
    err: unknown,
    _req,
    res,
    next,
) => {
    const { type, status, statusCode } = (err ?? {}) as Record<string, unknown>;
    const code = status ?? statusCode;

    if (typeof type === "string" && (code === 400 || code === 413)) {
        if (res.headersSent) {
            next(err);

            return;
        }

        if (code === 413) {
            res.status(413).json({ message: "Request too large" });
        } else {
            res.status(400).json({ message: "Invalid request" });
        }

        return;
    }

    next(err);
};
