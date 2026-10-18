import "@testing-library/jest-dom/vitest";

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
