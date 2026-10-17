import { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wraps an asynchronous route handler, as Express 4 does not handle its rejections. A rejection
 * answers with a 500, and only the kind of error is logged, never anything about the request body.
 *
 * @param handler The handler.
 * @returns The wrapped handler.
 */
export function asyncHandler(
    handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
): RequestHandler {
    return (req, res, next) => {
        handler(req, res, next).catch((e: unknown) => {
            console.error(
                `Unhandled error in ${req.method} ${req.baseUrl}${req.path}:`,
                e instanceof Error ? `${e.name}: ${e.message}` : typeof e,
            );

            if (res.headersSent) {
                // Leave it to Express to close the connection.
                next(e);

                return;
            }

            res.status(500).json({ message: "Internal server error" });
        });
    };
}
