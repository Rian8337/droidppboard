import { NavLink, To } from "react-router-dom";
import "../../styles/menu.css";

export default function MenuItem(props: { path: To; label: string }) {
    return (
        <NavLink
            className={({ isActive }) => (isActive ? "menu-active" : "")}
            end
            to={props.path}
        >
            {props.label}
        </NavLink>
    );
}
