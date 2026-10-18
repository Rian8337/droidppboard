import { Link } from "react-router";
import { EmptyState } from "../components/EmptyState";
import { getVariantPath, defaultVariant } from "../routing/paths";

export interface NotFoundPageProps {
    /** What was not found. Defaults to the page. */
    message?: string;
}

/** What a page shows when its address leads nowhere. */
export function NotFoundPage({ message = "Page not found" }: NotFoundPageProps) {
    return (
        <EmptyState
            message={message}
            action={<Link to={getVariantPath(defaultVariant)}>Go to the leaderboard</Link>}
        />
    );
}
