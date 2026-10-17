import { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import AuthContext from "../hooks/AuthContext";
import "../styles/main.css";
import "../styles/login.css";

export default function Header() {
    const authCtx = useContext(AuthContext);
    const location = useLocation();

    return (
        <div className="top-banner">
            <h1>osu!droid PP Project Testing Ground</h1>
            <p>PP development website for osu!droid.</p>
            {authCtx.isLoaded ? (
                <div className="header-auth">
                    {authCtx.user ? (
                        <>
                            <span>{authCtx.user.username}</span>
                            <button type="button" onClick={authCtx.logout}>
                                Logout
                            </button>
                            {authCtx.logoutError ? (
                                <span
                                    role="alert"
                                    className="header-auth-error"
                                >
                                    {authCtx.logoutError}
                                </span>
                            ) : null}
                        </>
                    ) : (
                        <Link
                            to="/login"
                            state={{
                                from: location.pathname + location.search,
                            }}
                        >
                            Login
                        </Link>
                    )}
                </div>
            ) : null}
        </div>
    );
}
