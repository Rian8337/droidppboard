import { NavLink } from "react-router-dom";
import "../styles/main.css";

export default function MenuItem(props: { path: string; label: string }) {
    return (
        <li>
            <NavLink
                className={({ isActive }) => (isActive ? "menu-active" : "")}
                end
                to={props.path}
            >
                {props.label}
            </NavLink>
        </li>
    );
}
