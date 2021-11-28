import { FC } from "react";
import { MainCalculationContextProvider } from "./MainCalculationContext";
import { MainLeaderboardNavigatorProvider } from "./MainLeaderboardNavigator";
import { MainTopPlaysNavigatorProvider } from "./MainTopPlaysNavigator";
import { PrototypeCalculationContextProvider } from "./PrototypeCalculationContext";
import { PrototypeLeaderboardNavigatorProvider } from "./PrototypeLeaderboardNavigator";
import { PrototypeTopPlaysNavigatorProvider } from "./PrototypeTopPlaysNavigator";
import { WhitelistNavigatorProvider } from "./WhitelistNavigator";

const compose =
    (...components: FC<Record<string, unknown>>[]) =>
    (props: { children: JSX.Element }) =>
        components.reduce(
            (children, Current) => <Current {...props}>{children}</Current>,
            props.children
        );

export const Providers = compose(
    MainLeaderboardNavigatorProvider,
    PrototypeLeaderboardNavigatorProvider,
    MainTopPlaysNavigatorProvider,
    PrototypeTopPlaysNavigatorProvider,
    MainCalculationContextProvider,
    PrototypeCalculationContextProvider,
    WhitelistNavigatorProvider
);
