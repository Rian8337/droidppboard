import { useParams } from "react-router";

/** Stands in for a variant's tabs until they are built. */
export function VariantPagePlaceholder() {
    const { tab } = useParams();

    return <p>{tab}</p>;
}
