import { PPVariant } from "app-structures";
import { PropsWithChildren, useState, createContext } from "react";

const defaultVariant: PPVariant = {
    name: "droid-rebalance",
    title: null,
    aliases: [],
    description: "Loading variant...",
    available: true,
    mode: "droid",
    algorithm: "rebalance",
};

const PrototypeSelectorNavigator = createContext({
    variants: [defaultVariant] as readonly PPVariant[],
    currentVariant: defaultVariant as PPVariant | undefined,
    setVariants: (variants: readonly PPVariant[]) => {},
    setCurrentVariant: (variant: PPVariant | undefined) => {},
    resetCurrentVariant: (name: string) => {},
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

    return (
        <PrototypeSelectorNavigator.Provider
            value={{
                variants,
                currentVariant,
                setVariants: modifyVariants,
                setCurrentVariant: modifyCurrentVariant,
                resetCurrentVariant,
            }}
        >
            {props.children}
        </PrototypeSelectorNavigator.Provider>
    );
}

export default PrototypeSelectorNavigator;
