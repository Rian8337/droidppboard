import { IPrototypePPType } from "app-structures";
import { PropsWithChildren, useState, createContext } from "react";

const defaultRework: IPrototypePPType = {
    name: "Overall",
    type: "overall",
};

const PrototypeSelectorNavigator = createContext({
    reworks: [defaultRework] as readonly IPrototypePPType[],
    currentRework: defaultRework as IPrototypePPType | undefined,
    setReworks: (reworks: readonly IPrototypePPType[]) => {},
    setCurrentRework: (rework: IPrototypePPType | undefined) => {},
    setCurrentReworkToUnknown: (type: string) => {},
});

export function PrototypeSelectorNavigatorProvider(props: PropsWithChildren) {
    const [reworks, setReworks] = useState<readonly IPrototypePPType[]>([]);
    const [currentRework, setCurrentRework] = useState<
        IPrototypePPType | undefined
    >(defaultRework);

    const modifyReworks = (reworks: readonly IPrototypePPType[] = []) => {
        setReworks(() => reworks);
    };

    const modifyCurrentRework = (rework?: IPrototypePPType) => {
        if (currentRework?.type === rework?.type) {
            return;
        }

        setCurrentRework(rework);
    };

    const modifyCurrentReworkToUnknown = (type: string) => {
        if (currentRework?.type === type) {
            return;
        }

        setCurrentRework({
            name: "Unknown",
            type,
        });
    };

    return (
        <PrototypeSelectorNavigator.Provider
            value={{
                reworks,
                currentRework,
                setReworks: modifyReworks,
                setCurrentRework: modifyCurrentRework,
                setCurrentReworkToUnknown: modifyCurrentReworkToUnknown,
            }}
        >
            {props.children}
        </PrototypeSelectorNavigator.Provider>
    );
}

export default PrototypeSelectorNavigator;
