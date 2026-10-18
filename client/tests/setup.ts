import "@testing-library/jest-dom/vitest";
import { server } from "./mocks/server";

// Node's fetch rejects relative URLs, which the app uses and a browser resolves against the page.
const nodeFetch = globalThis.fetch;

globalThis.fetch = (input, init) =>
    nodeFetch(typeof input === "string" ? new URL(input, location.href) : input, init);

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// jsdom does not implement the modal parts of <dialog>; mirror what browsers do for `open` and `close`.
if (typeof HTMLDialogElement !== "undefined" && !HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
        this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close() {
        if (!this.hasAttribute("open")) {
            return;
        }

        this.removeAttribute("open");
        this.dispatchEvent(new Event("close"));
    };
}
