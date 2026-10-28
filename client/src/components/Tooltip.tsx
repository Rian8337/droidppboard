import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import styles from "./Tooltip.module.css";

export interface TooltipProps {
    content: string;
    children: ReactNode;

    /**
     * Where the bubble sits under the control. `end` lines its right edge up with the control's, for a control at the
     * right edge of a scrolling container, which would clip a centered bubble.
     */
    align?: "center" | "end";
}

/**
 * A short hint for the wrapped control. It shows on mouse hover, keyboard focus and on a tap (touch has no hover),
 * and hides on leave, blur, Escape or a press elsewhere.
 */
export function Tooltip({ content, children, align = "center" }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const rootRef = useRef<HTMLSpanElement>(null);
    const tooltipId = useId();

    useEffect(() => {
        if (!isVisible) {
            return;
        }

        function hideOnOutsidePress(event: PointerEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsVisible(false);
            }
        }

        function hideOnEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setIsVisible(false);
            }
        }

        document.addEventListener("pointerdown", hideOnOutsidePress);
        document.addEventListener("keydown", hideOnEscape);

        return () => {
            document.removeEventListener("pointerdown", hideOnOutsidePress);
            document.removeEventListener("keydown", hideOnEscape);
        };
    }, [isVisible]);

    return (
        <span
            ref={rootRef}
            className={styles.tooltip}
            aria-describedby={isVisible ? tooltipId : undefined}
            onPointerEnter={(event) => {
                // A touch also fires pointerenter right before its tap; only a real mouse hovers.
                if (event.pointerType === "mouse") {
                    setIsVisible(true);
                }
            }}
            onPointerLeave={(event) => {
                if (event.pointerType === "mouse") {
                    setIsVisible(false);
                }
            }}
            onFocus={() => setIsVisible(true)}
            onBlur={() => setIsVisible(false)}
            onClick={() => setIsVisible(true)}
        >
            {children}
            {isVisible && (
                <span id={tooltipId} role="tooltip" className={styles.bubble} data-align={align}>
                    {content}
                </span>
            )}
        </span>
    );
}
