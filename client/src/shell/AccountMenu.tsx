import { faChevronDown, faRightFromBracket, faUserShield } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link, useLocation, useNavigate } from "react-router";
import { useLogout, useMe } from "../api/auth";
import { Menu, type MenuItem } from "../components/Menu";
import styles from "./AccountMenu.module.css";
import { isAdmin } from "../variant/permissions";
import { formatError } from "../api/http";

/** The logged in person's avatar and menu, or a button to log in if nobody is. */
export function AccountMenu() {
    const { data: me, isPending } = useMe();
    const logout = useLogout();
    const navigate = useNavigate();
    const location = useLocation();

    if (isPending) {
        return null;
    }

    if (!me) {
        return (
            <Link
                to="/login"
                state={{ from: location.pathname + location.search }}
                className={styles.login}
            >
                Log in
            </Link>
        );
    }

    const items: MenuItem[] = [];

    if (isAdmin(me)) {
        items.push({
            label: "Admin",
            icon: <FontAwesomeIcon icon={faUserShield} fixedWidth />,
            onSelect: () => void navigate("/admin"),
        });
    }

    items.push({
        label: "Log out",
        icon: <FontAwesomeIcon icon={faRightFromBracket} fixedWidth />,
        tone: "danger",
        // On failure the error shows in the menu, so it must still be there to be seen.
        keepOpen: true,
        onSelect: () => logout.mutate(),
    });

    return (
        <Menu
            trigger={
                <>
                    <img
                        src={`https://osudroid.moe/user/avatar?id=${me.uid}`}
                        alt=""
                        className={styles.avatar}
                    />
                    <span className={styles.username}>{me.username}</span>
                    <FontAwesomeIcon icon={faChevronDown} />
                </>
            }
            items={items}
            onOpen={() => logout.reset()}
            footer={
                logout.error && (
                    <p role="alert" className={styles.error}>
                        {formatError(logout.error)}
                    </p>
                )
            }
        />
    );
}
