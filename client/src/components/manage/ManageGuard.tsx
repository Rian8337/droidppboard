import { PropsWithChildren, useContext } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import Head from "../Head";
import AuthContext from "../../hooks/AuthContext";
import "../../styles/manage.css";

/**
 * Wraps a management page, showing it only to people with a role. The broker enforces access
 * regardless; this only decides what to show.
 */
export default function ManageGuard(
    props: PropsWithChildren<{ title: string; adminOnly?: boolean }>
) {
    const { user, isLoaded } = useContext(AuthContext);
    const location = useLocation();

    const isAllowed =
        !!user && (props.adminOnly ? user.role === "admin" : !!user.role);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            <Head
                description="Manage variants of the osu!droid PP Project."
                title={`PP Board - ${props.title}`}
            />

            <h2 className="subtitle">{props.title}</h2>

            {!isLoaded ? (
                <h3 className="description">Loading...</h3>
            ) : !user || !isAllowed ? (
                <div className="manage-container">
                    <h3 className="description">
                        You don&apos;t have access to this page.
                    </h3>
                    {user ? null : (
                        <p className="manage-center">
                            <Link
                                to="/login"
                                state={{ from: location.pathname }}
                            >
                                Log in
                            </Link>
                        </p>
                    )}
                </div>
            ) : (
                <div className="manage-container">
                    <nav className="manage-nav">
                        <NavLink end to="/manage">
                            Variants
                        </NavLink>
                        {user.role === "admin" ? (
                            <>
                                <NavLink to="/manage/users">Users</NavLink>
                                <NavLink to="/manage/keys">API keys</NavLink>
                            </>
                        ) : null}
                    </nav>
                    {props.children}
                </div>
            )}
        </motion.div>
    );
}
