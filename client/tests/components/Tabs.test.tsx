import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router";
import { Tabs } from "../../src/components/Tabs";

describe("Tabs", () => {
    it("renders each tab as a link and marks the active one", () => {
        render(
            <MemoryRouter>
                <Tabs
                    activeId="leaderboard"
                    tabs={[
                        { id: "info", label: "Info", to: "/droid-rebalance" },
                        {
                            id: "leaderboard",
                            label: "Leaderboard",
                            to: "/droid-rebalance/leaderboard",
                        },
                    ]}
                />
            </MemoryRouter>,
        );

        const active = screen.getByRole("link", { name: "Leaderboard" });

        expect(active).toHaveAttribute("href", "/droid-rebalance/leaderboard");
        expect(active).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("link", { name: "Info" })).not.toHaveAttribute("aria-current");
    });

    describe("on a phone", () => {
        const tabs = [
            { id: "info", label: "Info", to: "/info" },
            { id: "queue", label: "Queue", to: "/queue" },
        ];

        afterEach(() => {
            Reflect.deleteProperty(Element.prototype, "scrollIntoView");
        });

        it("scrolls the active tab into view, and the new one when it changes", async () => {
            const scrollIntoView = vi.fn(function (this: Element) {});

            Element.prototype.scrollIntoView = scrollIntoView;

            function Harness() {
                const [activeId, setActiveId] = useState("info");

                return (
                    <MemoryRouter>
                        <button onClick={() => setActiveId("queue")}>Change</button>
                        <Tabs tabs={tabs} activeId={activeId} />
                    </MemoryRouter>
                );
            }

            render(<Harness />);

            expect(scrollIntoView).toHaveBeenCalledTimes(1);
            expect(scrollIntoView.mock.contexts[0]).toBe(
                screen.getByRole("link", { name: "Info" }),
            );
            expect(scrollIntoView).toHaveBeenCalledWith({ inline: "nearest", block: "nearest" });

            await userEvent.click(screen.getByRole("button", { name: "Change" }));

            expect(scrollIntoView).toHaveBeenCalledTimes(2);
            expect(scrollIntoView.mock.contexts[1]).toBe(
                screen.getByRole("link", { name: "Queue" }),
            );
        });

        it("renders without scrollIntoView, as in jsdom", () => {
            render(
                <MemoryRouter>
                    <Tabs tabs={tabs} activeId="info" />
                </MemoryRouter>,
            );

            expect(screen.getByRole("link", { name: "Info" })).toBeVisible();
        });
    });

    it("names the row for assistive technology", () => {
        render(
            <MemoryRouter>
                <Tabs
                    tabs={[{ id: "info", label: "Info", to: "/info" }]}
                    activeId="info"
                    aria-label="Rework pages"
                />
            </MemoryRouter>,
        );

        expect(screen.getByRole("navigation", { name: "Rework pages" })).toBeVisible();
    });
});
