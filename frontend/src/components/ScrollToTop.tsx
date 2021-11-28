import { useState } from "react";
import { FaArrowCircleUp } from "react-icons/fa";
import "../styles/modules/components/ScrollToTop.module.css";

export default function ScrollToTop() {
    const [visible, setVisible] = useState<boolean>(false);

    window.addEventListener("scroll", () => {
        setVisible(document.documentElement.scrollTop > 300);
    });

    return (
        <FaArrowCircleUp
            className="scroll-to-top"
            style={{
                display: visible ? "inline" : "none",
            }}
            onClick={() =>
                window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                })
            }
        />
    );
}
