import { useState } from "react";
import { Outlet } from "react-router";
import { useBreakpoint } from "../hooks/useBreakpoint";
import styles from "./AppLayout.module.css";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/**
 * The frame every page renders in: the top bar, the sidebar and the page itself. The sidebar is
 * open next to the page on a desktop, and a closed drawer over it on a tablet or phone.
 */
export function AppLayout() {
    const breakpoint = useBreakpoint();
    const isDesktop = breakpoint === "desktop";
    const [isSidebarOpen, setIsSidebarOpen] = useState(isDesktop);
    const [previousBreakpoint, setPreviousBreakpoint] = useState(breakpoint);

    // The screen changed size, such as a tablet turning, so the sidebar returns to its default.
    if (breakpoint !== previousBreakpoint) {
        setPreviousBreakpoint(breakpoint);
        setIsSidebarOpen(isDesktop);
    }

    return (
        <div className={styles.layout}>
            <TopBar
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen((wasOpen) => !wasOpen)}
            />
            <div className={styles.body} data-breakpoint={breakpoint}>
                {isSidebarOpen && (
                    <>
                        {breakpoint === "tablet" && (
                            <div
                                className={styles.backdrop}
                                aria-hidden="true"
                                onClick={() => setIsSidebarOpen(false)}
                            />
                        )}
                        <div className={styles.sidebar}>
                            <Sidebar
                                onNavigate={() => {
                                    if (!isDesktop) {
                                        setIsSidebarOpen(false);
                                    }
                                }}
                            />
                        </div>
                    </>
                )}
                <main className={styles.content}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
