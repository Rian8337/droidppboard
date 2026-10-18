import { screen, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { droidRebalance, flowaim, managerMe, plainMe } from "../mocks/fixtures";
import { server } from "../mocks/server";

export type Person = "manager" | "player" | null;

export interface MockedSession {
    /** When the server last changed who is logged in, which is when its answer was sent. */
    getChangedAt: () => number | null;
}

/**
 * Makes the mocked server answer for one person at a time, and lets login and logout switch them
 * with a realistic latency. Once the person has changed its answers get slow, so that anything
 * left over from before would still be on screen when the new answers arrive.
 */
export function mockSession(initial: Person = "manager"): MockedSession {
    let person = initial;
    let changedAt: number | null = null;

    function changePerson(next: Person): void {
        person = next;
        changedAt = Date.now();
    }

    server.use(
        http.get("/api/auth/me", async () => {
            await delay(changedAt === null ? 0 : 300);

            return person === null
                ? HttpResponse.json({ message: "Not logged in" }, { status: 401 })
                : HttpResponse.json(person === "manager" ? managerMe : plainMe);
        }),
        http.get("/api/ppboard/variants", async () => {
            await delay(changedAt === null ? 0 : 150);

            return HttpResponse.json(
                person === "manager" ? [droidRebalance, flowaim] : [droidRebalance],
            );
        }),
        http.post("/api/auth/logout", async () => {
            await delay(80);
            changePerson(null);

            return new HttpResponse(null, { status: 204 });
        }),
        http.post("/api/auth/login", async () => {
            await delay(80);
            changePerson("player");

            return HttpResponse.json({ uid: plainMe.uid, username: plainMe.username });
        }),
    );

    return { getChangedAt: () => changedAt };
}

/**
 * Counts how often `text` is on screen from a moment after the server changed who is logged in
 * (the grace is for the response to arrive) until `sampleCount` samples have been taken.
 *
 * @returns A function that waits for the samples and gives the number of sightings.
 */
export function watchFor(text: string, { getChangedAt }: MockedSession, sampleCount = 40) {
    let sightings = 0;
    let samples = 0;
    const interval = setInterval(() => {
        const changedAt = getChangedAt();

        if (changedAt === null || Date.now() - changedAt < 30) {
            return;
        }

        samples++;

        if (screen.queryByText(text)) {
            sightings++;
        }
    }, 5);

    return async () => {
        try {
            await waitFor(() => expect(samples).toBeGreaterThan(sampleCount));
        } finally {
            clearInterval(interval);
        }

        return sightings;
    };
}
