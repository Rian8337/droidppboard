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
        setCurrentRework(rework);
    };

    return (
        <PrototypeSelectorNavigator.Provider
            value={{
                reworks,
                currentRework,
                setReworks: modifyReworks,
                setCurrentRework: modifyCurrentRework,
            }}
        >
            {props.children}
        </PrototypeSelectorNavigator.Provider>
    );
}

export default PrototypeSelectorNavigator;
