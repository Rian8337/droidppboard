import {
    PropsWithChildren,
    createContext,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

/**
 * The logged in user, as reported by the server.
 */
export interface AuthUser {
    readonly uid: number;
    readonly username: string;
    readonly role: "admin" | "manager" | null;
    readonly grants: readonly string[];
}

interface AuthContextValue {
    /**
     * The logged in user, or `null` if nobody is logged in (or the state is not known yet).
     */
    readonly user: AuthUser | null;

    /**
     * Whether the initial login state has been loaded.
     */
    readonly isLoaded: boolean;

    /**
     * The error of the last failed logout, if any. The user stays logged in in that case.
     */
    readonly logoutError: string | undefined;

    /**
     * Reloads the login state from the server.
     */
    refresh(): Promise<void>;

    /**
     * Logs the current user out.
     */
    logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
    user: null,
    isLoaded: false,
    logoutError: undefined,
    refresh: async () => {},
    logout: async () => {},
});

export function AuthContextProvider(props: PropsWithChildren) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoaded, setLoaded] = useState(false);
    const [logoutError, setLogoutError] = useState<string | undefined>();

    const refresh = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/me", {
                signal: AbortSignal.timeout(10000),
            });

            // Any non-OK response (including a 401 while the server's database is down)
            // and a timeout are treated as logged out. There is no retry.
            setUser(res.ok ? ((await res.json()) as AuthUser) : null);
        } catch {
            setUser(null);
        } finally {
            setLoaded(true);
        }
    }, []);

    const logout = useCallback(async () => {
        setLogoutError(undefined);

        try {
            const res = await fetch("/api/auth/logout", { method: "POST" });

            if (!res.ok) {
                throw new Error("Logout was refused");
            }
        } catch {
            // The session may still exist, so the user state is kept.
            setLogoutError("Logout failed, please try again");

            return;
        }

        await refresh();
    }, [refresh]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const value = useMemo(
        () => ({ user, isLoaded, logoutError, refresh, logout }),
        [user, isLoaded, logoutError, refresh, logout]
    );

    return (
        <AuthContext.Provider value={value}>
            {props.children}
        </AuthContext.Provider>
    );
}

export default AuthContext;
