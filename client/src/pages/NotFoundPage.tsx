import { Link } from "react-router";
import { EmptyState } from "../components/EmptyState";
import { getVariantPath, defaultVariant } from "../routing/paths";

/** What a page shows when its address leads nowhere. */
export function NotFoundPage() {
    return (
        <EmptyState
            message="Page not found"
            action={<Link to={getVariantPath(defaultVariant)}>Go to the leaderboard</Link>}
        />
    );
}
