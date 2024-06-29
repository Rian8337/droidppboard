import { FC } from "react";
import { MainCalculationContextProvider } from "./MainCalculationContext";
import { MainLeaderboardNavigatorProvider } from "./MainLeaderboardNavigator";
import { MainTopPlaysNavigatorProvider } from "./MainTopPlaysNavigator";
import { PrototypeCalculationContextProvider } from "./PrototypeCalculationContext";
import { PrototypeLeaderboardNavigatorProvider } from "./PrototypeLeaderboardNavigator";
import { PrototypeTopPlaysNavigatorProvider } from "./PrototypeTopPlaysNavigator";
import { WhitelistNavigatorProvider } from "./WhitelistNavigator";
import { SkinListNavigatorProvider } from "./SkinListNavigator";
import { InGameLeaderboardNavigatorProvider } from "./InGameLeaderboardNavigator";
import { InGameTopPlaysNavigatorProvider } from "./InGameTopPlaysNavigator";
import { PrototypeSelectorNavigatorProvider } from "./PrototypeSelectorNavigator";

const compose =
    (...components: FC<Record<string, unknown>>[]) =>
    (props: { children: JSX.Element }) =>
        components.reduce(
            (children, Current) => <Current {...props}>{children}</Current>,
            props.children
        );

export const Providers = compose(
    MainLeaderboardNavigatorProvider,
    InGameLeaderboardNavigatorProvider,
    PrototypeLeaderboardNavigatorProvider,
    PrototypeSelectorNavigatorProvider,
    MainTopPlaysNavigatorProvider,
    InGameTopPlaysNavigatorProvider,
    PrototypeTopPlaysNavigatorProvider,
    MainCalculationContextProvider,
    PrototypeCalculationContextProvider,
    WhitelistNavigatorProvider,
    SkinListNavigatorProvider
);
