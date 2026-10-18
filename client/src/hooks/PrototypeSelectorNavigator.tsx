import { PPVariant } from "app-structures";
import {
    PropsWithChildren,
    useState,
    createContext,
    useContext,
    useEffect,
    useRef,
} from "react";
import AuthContext from "./AuthContext";

const defaultVariant: PPVariant = {
    name: "droid-rebalance",
    title: null,
    aliases: [],
    description: null,
    available: true,
    healthyInstanceCount: 1,
    mode: "droid",
    algorithm: "rebalance",
    public: true,
    builtAt: null,
    calculatorVersion: null,
};

const PrototypeSelectorNavigator = createContext({
    variants: [defaultVariant] as readonly PPVariant[],
    currentVariant: defaultVariant as PPVariant | undefined,
    setVariants: (variants: readonly PPVariant[]) => {},
    setCurrentVariant: (variant: PPVariant | undefined) => {},
    resetCurrentVariant: (name: string) => {},
    clearVariants: () => {},
});

export function PrototypeSelectorNavigatorProvider(props: PropsWithChildren) {
    const [variants, setVariants] = useState<readonly PPVariant[]>([]);

    const [currentVariant, setCurrentVariant] = useState<PPVariant | undefined>(
        defaultVariant
    );

    const modifyVariants = (variants: readonly PPVariant[] = []) => {
        setVariants(() => variants);
    };

    const modifyCurrentVariant = (variant?: PPVariant) => {
        setCurrentVariant(variant);
    };

    const resetCurrentVariant = (name: string) => {
        setCurrentVariant({
            ...defaultVariant,
            name: name,
        });
    };

    // Forgets everything that was learned about variants, keeping only the name of the current one
    // (so that effects keyed on it do not fetch again).
    const clearVariants = () => {
        setVariants([]);
        setCurrentVariant((current) =>
            current ? { ...defaultVariant, name: current.name } : current
        );
    };

    // What a person can see depends on who they are, so nothing is kept across a login or logout.
    const authCtx = useContext(AuthContext);
    const uid = authCtx.user?.uid;
    const previousUid = useRef(uid);

    useEffect(() => {
        if (previousUid.current !== uid) {
            previousUid.current = uid;
            clearVariants();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uid]);

    return (
        <PrototypeSelectorNavigator.Provider
            value={{
                variants,
                currentVariant,
                setVariants: modifyVariants,
                setCurrentVariant: modifyCurrentVariant,
                resetCurrentVariant,
                clearVariants,
            }}
        >
            {props.children}
        </PrototypeSelectorNavigator.Provider>
    );
}

export default PrototypeSelectorNavigator;
