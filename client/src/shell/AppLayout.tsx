import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router";
import { useBreakpoint } from "../hooks/useBreakpoint";
import styles from "./AppLayout.module.css";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/**
 * The frame every page renders in: the top bar, the sidebar and the page itself. The sidebar is
 * open next to the page on a desktop, and a closed drawer over it on a tablet or phone. It slides
 * in and out, and a click anywhere outside it closes it.
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

    useEffect(() => {
        if (!isSidebarOpen) {
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
    }, [isSidebarOpen]);

    return (
        <div className={styles.layout}>
            <TopBar
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen((wasOpen) => !wasOpen)}
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
                                setIsSidebarOpen(false);
                            }
                        }}
                    />
                </div>
                <main className={styles.content}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
