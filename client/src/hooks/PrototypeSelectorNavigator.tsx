import { IPrototypePPType } from "app-structures";
import { PropsWithChildren, useState, createContext } from "react";

const defaultRework: IPrototypePPType = {
    name: "Unknown",
    type: "overall",
    description: "Loading rework...",
};

const PrototypeSelectorNavigator = createContext({
    reworks: [defaultRework] as readonly Pick<
        IPrototypePPType,
        "name" | "type"
    >[],
    currentRework: defaultRework as IPrototypePPType | undefined,
    setReworks: (reworks: readonly IPrototypePPType[]) => {},
    setCurrentRework: (rework: IPrototypePPType | undefined) => {},
    resetCurrentRework: (type: string) => {},
});

export function PrototypeSelectorNavigatorProvider(props: PropsWithChildren) {
    const [reworks, setReworks] = useState<
        readonly Pick<IPrototypePPType, "name" | "type">[]
    >([]);

    const [currentRework, setCurrentRework] = useState<
        IPrototypePPType | undefined
    >(defaultRework);

    const modifyReworks = (
        reworks: readonly Pick<IPrototypePPType, "name" | "type">[] = []
    ) => {
        setReworks(() => reworks);
    };

    const modifyCurrentRework = (rework?: IPrototypePPType) => {
        setCurrentRework(rework);
    };

    const resetCurrentRework = (type: string) => {
        setCurrentRework({
            ...defaultRework,
            type: type,
        });
    };

    return (
        <PrototypeSelectorNavigator.Provider
            value={{
                reworks,
                currentRework,
                setReworks: modifyReworks,
                setCurrentRework: modifyCurrentRework,
                resetCurrentRework: resetCurrentRework,
            }}
        >
            {props.children}
        </PrototypeSelectorNavigator.Provider>
    );
}

export default PrototypeSelectorNavigator;
