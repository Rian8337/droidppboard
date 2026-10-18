import { z } from "zod";

const queueRequestSchema = z
    .object({
        variant: z.string().min(1),
        uid: z.number().int().positive().optional(),
        username: z.string().trim().min(2).max(20).optional(),
    })
    .refine(
        (request) =>
            (request.uid === undefined) !== (request.username === undefined),
    );

const fullRunStartSchema = z.object({
    restart: z.boolean().default(false),
});

/**
 * Parses the body of a request to queue a player.
 *
 * @param body The parsed JSON body.
 * @returns The variant and the player (a uid or a trimmed username), or `null` if the body is
 * malformed or does not give exactly one of `uid` and `username`.
 */
export function parseQueueRequest(
    body: unknown,
): { variant: string; player: number | string } | null {
    const result = queueRequestSchema.safeParse(body);

    if (!result.success) {
        return null;
    }

    const { variant, uid, username } = result.data;

    return { variant, player: uid ?? username! };
}

/**
 * Parses the body of a request to start a full run.
 *
 * @param body The parsed JSON body. A missing body is the same as an empty one.
 * @returns Whether to start over, or `null` if the body is malformed.
 */
export function parseFullRunStartRequest(
    body: unknown,
): { restart: boolean } | null {
    const result = fullRunStartSchema.safeParse(body ?? {});

    return result.success ? result.data : null;
}
