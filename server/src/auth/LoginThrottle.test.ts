import { beforeEach, describe, expect, it } from "vitest";
import { LoginThrottle } from "./LoginThrottle";

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;

describe("LoginThrottle", () => {
    let time: number;
    let throttle: LoginThrottle;

    beforeEach(() => {
        time = 1_000_000;
        throttle = new LoginThrottle(() => time);
    });

    function fail(username: string, ip = "1.1.1.1"): void {
        throttle.check(ip, username);
        throttle.recordFailure(ip, username);
    }

    it("delays a username after three failures", () => {
        for (let i = 0; i < 3; ++i) {
            expect(throttle.check("1.1.1.1", "alice")).toEqual({
                allowed: true,
            });
            throttle.recordFailure("1.1.1.1", "alice");
        }

        expect(throttle.check("1.1.1.1", "alice")).toEqual({
            allowed: false,
            retryAfterSeconds: 2,
        });

        time += 1 * second;
        expect(throttle.check("1.1.1.1", "alice")).toEqual({
            allowed: false,
            retryAfterSeconds: 1,
        });

        time += 1 * second;
        expect(throttle.check("1.1.1.1", "alice")).toEqual({ allowed: true });
        throttle.recordFailure("1.1.1.1", "alice");

        expect(throttle.check("1.1.1.1", "alice")).toEqual({
            allowed: false,
            retryAfterSeconds: 4,
        });

        time += 4 * second;
        expect(throttle.check("1.1.1.1", "alice")).toEqual({ allowed: true });
        throttle.recordFailure("1.1.1.1", "alice");

        expect(throttle.check("1.1.1.1", "alice")).toEqual({
            allowed: false,
            retryAfterSeconds: 8,
        });
    });

    it("caps the delay at fifteen minutes", () => {
        // Use different IPs so that the IP limit does not interfere.
        for (let i = 0; i < 20; ++i) {
            const ip = `10.0.0.${i}`;

            time += 15 * minute;
            expect(throttle.check(ip, "alice").allowed).toBe(true);
            throttle.recordFailure(ip, "alice");
        }

        expect(throttle.check("10.0.1.1", "alice")).toEqual({
            allowed: false,
            retryAfterSeconds: 900,
        });
    });

    it("resets a username after an hour without failures and on success", () => {
        for (let i = 0; i < 3; ++i) {
            fail("alice");
        }

        expect(throttle.check("2.2.2.2", "alice").allowed).toBe(false);

        time += hour;
        expect(throttle.check("2.2.2.2", "alice")).toEqual({ allowed: true });

        // The failure count starts over: two failures do not delay.
        fail("alice", "3.3.3.3");
        fail("alice", "3.3.3.3");
        expect(throttle.check("3.3.3.3", "alice")).toEqual({ allowed: true });

        fail("alice", "3.3.3.3");
        expect(throttle.check("4.4.4.4", "alice").allowed).toBe(false);

        throttle.recordSuccess("alice");
        expect(throttle.check("4.4.4.4", "alice")).toEqual({ allowed: true });
    });

    it("limits an IP to ten attempts in fifteen minutes", () => {
        for (let i = 0; i < 10; ++i) {
            expect(throttle.check("5.5.5.5", `user${i}`)).toEqual({
                allowed: true,
            });
            time += 1 * second;
        }

        const result = throttle.check("5.5.5.5", "another");

        expect(result.allowed).toBe(false);

        // The first attempt was 10 seconds ago.
        expect(result).toEqual({
            allowed: false,
            retryAfterSeconds: 15 * 60 - 10,
        });

        // Other IPs are unaffected.
        expect(throttle.check("6.6.6.6", "another")).toEqual({ allowed: true });

        time += 15 * minute;
        expect(throttle.check("5.5.5.5", "another")).toEqual({ allowed: true });
    });

    it("does not extend the IP window with refused requests", () => {
        for (let i = 0; i < 10; ++i) {
            throttle.check("5.5.5.5", `user${i}`);
        }

        for (let i = 0; i < 5; ++i) {
            time += 3 * minute;
            throttle.check("5.5.5.5", "another");
        }

        // 15 minutes have passed since the first ten attempts.
        expect(throttle.check("5.5.5.5", "another")).toEqual({ allowed: true });
    });

    it("does not count an attempt against the IP when the username is delayed", () => {
        for (let i = 0; i < 3; ++i) {
            throttle.recordFailure("9.9.9.9", "alice");
        }

        for (let i = 0; i < 20; ++i) {
            expect(throttle.check("7.7.7.7", "alice").allowed).toBe(false);
        }

        expect(throttle.check("7.7.7.7", "bob")).toEqual({ allowed: true });
    });

    it("limits usernames independently", () => {
        for (let i = 0; i < 3; ++i) {
            fail("alice");
        }

        expect(throttle.check("8.8.8.8", "alice").allowed).toBe(false);
        expect(throttle.check("8.8.8.8", "bob")).toEqual({ allowed: true });
    });

    it("compares usernames case-insensitively", () => {
        for (let i = 0; i < 3; ++i) {
            fail(i % 2 === 0 ? "Alice" : "aLICE");
        }

        expect(throttle.check("8.8.8.8", "ALICE").allowed).toBe(false);

        throttle.recordSuccess("alice");
        expect(throttle.check("8.8.8.8", "ALICE")).toEqual({ allowed: true });
    });

    it("refuses all logins for five minutes after a hundred failures in five minutes", () => {
        for (let i = 0; i < 100; ++i) {
            throttle.recordFailure(`10.1.${i}.1`, `user${i}`);
        }

        expect(throttle.check("11.1.1.1", "fresh")).toEqual({ allowed: true });

        throttle.recordFailure("10.2.0.1", "user-extra");

        time += 1 * minute;
        expect(throttle.check("11.1.1.1", "fresh")).toEqual({
            allowed: false,
            retryAfterSeconds: 4 * 60,
        });

        time += 4 * minute;
        expect(throttle.check("11.1.1.1", "fresh")).toEqual({ allowed: true });
    });

    it("does not count failures spread over more than five minutes", () => {
        for (let i = 0; i < 150; ++i) {
            throttle.recordFailure(`10.1.${i}.1`, `user${i}`);
            time += 5 * second;
        }

        expect(throttle.check("11.1.1.1", "fresh")).toEqual({ allowed: true });
    });
});
