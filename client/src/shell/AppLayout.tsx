import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router";
import { useBreakpoint } from "../hooks/useBreakpoint";
import styles from "./AppLayout.module.css";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/**
 * The frame every page renders in: the top bar, the sidebar and the page itself. The sidebar is
 * open next to the page on a desktop, and a closed drawer over it on a tablet or phone. It slides
 * in and out. An open drawer closes on Escape or a click anywhere outside it, and keeps the page
 * behind it from scrolling. A desktop's sidebar only closes through its toggle, as it sits beside the page
 * rather than over it.
 */
export function AppLayout() {
    const breakpoint = useBreakpoint();
    const isDesktop = breakpoint === "desktop";
    const [isSidebarOpen, setIsSidebarOpen] = useState(isDesktop);
    const [previousBreakpoint, setPreviousBreakpoint] = useState(breakpoint);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const toggleRef = useRef<HTMLButtonElement>(null);

    // The screen changed size, such as a tablet turning, so the sidebar returns to its default.
    if (breakpoint !== previousBreakpoint) {
        setPreviousBreakpoint(breakpoint);
        setIsSidebarOpen(isDesktop);
    }

    /**
     * Closes the sidebar. Focus inside it moves to the toggle first, as a closed sidebar is hidden
     * from assistive technology and must not hold the focus.
     */
    function closeSidebar() {
        if (sidebarRef.current?.contains(document.activeElement)) {
            toggleRef.current?.focus();
        }

        setIsSidebarOpen(false);
    }

    useEffect(() => {
        if (!isSidebarOpen || isDesktop) {
            return;
        }

        const { style } = document.documentElement;
        const previousOverflow = style.overflow;

        style.overflow = "hidden";

        return () => {
            style.overflow = previousOverflow;
        };
    }, [isSidebarOpen, isDesktop]);

    useEffect(() => {
        if (!isSidebarOpen || isDesktop) {
            return;
        }

        function closeOnOutsideClick(event: MouseEvent) {
            const target = event.target;

            // The toggle closes the sidebar by itself.
            if (
                !(target instanceof Node) ||
                sidebarRef.current?.contains(target) ||
                toggleRef.current?.contains(target)
            ) {
                return;
            }

            setIsSidebarOpen(false);
        }

        document.addEventListener("click", closeOnOutsideClick);

        return () => document.removeEventListener("click", closeOnOutsideClick);
    }, [isSidebarOpen, isDesktop]);

    useEffect(() => {
        if (!isSidebarOpen || isDesktop) {
            return;
        }

        // An open drawer is a modal layer over the page, which Escape closes like any other.
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                closeSidebar();
            }
        }

        document.addEventListener("keydown", closeOnEscape);

        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [isSidebarOpen, isDesktop]);

    return (
        <div className={styles.layout}>
            <TopBar
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => (isSidebarOpen ? closeSidebar() : setIsSidebarOpen(true))}
                toggleRef={toggleRef}
            />
            <div className={styles.body} data-breakpoint={breakpoint}>
                {isSidebarOpen && breakpoint === "tablet" && (
                    <div className={styles.backdrop} aria-hidden="true" />
                )}
                {/* Always rendered, so that it can slide out; a closed sidebar is hidden and inert. */}
                <div
                    ref={sidebarRef}
                    className={styles.sidebar}
                    data-open={isSidebarOpen}
                    aria-hidden={isSidebarOpen ? undefined : true}
                    inert={!isSidebarOpen}
                >
                    <Sidebar
                        onNavigate={() => {
                            if (!isDesktop) {
                                closeSidebar();
                            }
                        }}
                    />
                </div>
                {/* The page behind an open drawer is out of reach, so keyboards and screen readers skip it too. */}
                <main className={styles.content} inert={isSidebarOpen && !isDesktop}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
