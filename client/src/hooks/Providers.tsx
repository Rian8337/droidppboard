import { FC } from "react";
import { MainCalculationContextProvider } from "./MainCalculationContext";
import { PrototypeCalculationContextProvider } from "./PrototypeCalculationContext";
import { PrototypeLeaderboardNavigatorProvider } from "./PrototypeLeaderboardNavigator";
import { PrototypeTopPlaysNavigatorProvider } from "./PrototypeTopPlaysNavigator";
import { WhitelistNavigatorProvider } from "./WhitelistNavigator";
import { SkinListNavigatorProvider } from "./SkinListNavigator";
import { PrototypeSelectorNavigatorProvider } from "./PrototypeSelectorNavigator";

const compose =
    (...components: FC<Record<string, unknown>>[]) =>
    (props: { children: JSX.Element }) =>
        components.reduce(
            (children, Current) => <Current {...props}>{children}</Current>,
            props.children
        );

export const Providers = compose(
    PrototypeLeaderboardNavigatorProvider,
    PrototypeSelectorNavigatorProvider,
    PrototypeTopPlaysNavigatorProvider,
    MainCalculationContextProvider,
    PrototypeCalculationContextProvider,
    WhitelistNavigatorProvider,
    SkinListNavigatorProvider
);
