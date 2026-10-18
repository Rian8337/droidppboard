import {
    faCalculator,
    faCircleInfo,
    faListUl,
    faRankingStar,
    faStar,
    faUserShield,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useMe } from "../api/auth";
import { Tabs, type Tab } from "../components/Tabs";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { getVariantPath, type VariantTab } from "../routing/paths";
import { canManageVariant } from "./permissions";

const tabDetails: Readonly<Record<VariantTab, Pick<Tab, "label" | "icon">>> = {
    info: { label: "Info", icon: <FontAwesomeIcon icon={faCircleInfo} /> },
    leaderboard: { label: "Leaderboard", icon: <FontAwesomeIcon icon={faRankingStar} /> },
    "top-plays": { label: "Top plays", icon: <FontAwesomeIcon icon={faStar} /> },
    queue: { label: "Queue", icon: <FontAwesomeIcon icon={faListUl} /> },
    calculator: { label: "Calculator", icon: <FontAwesomeIcon icon={faCalculator} /> },
    admin: { label: "Admin", icon: <FontAwesomeIcon icon={faUserShield} /> },
};

const desktopOrder: readonly VariantTab[] = [
    "info",
    "leaderboard",
    "top-plays",
    "queue",
    "calculator",
    "admin",
];

/** On a phone people open the leaderboard most, so it comes first and Info last. */
const phoneOrder: readonly VariantTab[] = [
    "leaderboard",
    "top-plays",
    "queue",
    "calculator",
    "admin",
    "info",
];

export interface VariantTabsProps {
    /** The name of the variant the tabs belong to. */
    variant: string;
    activeTab: VariantTab;
}

/** The tab row of a variant. Admin is only there for those who can manage the variant. */
export function VariantTabs({ variant, activeTab }: VariantTabsProps) {
    const isPhone = useBreakpoint() === "phone";
    const { data: me = null } = useMe();
    const canManage = canManageVariant(me, variant);

    const tabs = (isPhone ? phoneOrder : desktopOrder)
        .filter((id) => id !== "admin" || canManage)
        .map((id) => ({ id, ...tabDetails[id], to: getVariantPath(variant, id) }));

    return <Tabs tabs={tabs} activeId={activeTab} />;
}
