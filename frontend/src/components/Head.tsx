import { Helmet } from "react-helmet";

export default function Head(
    props: { description?: string; title?: string } = {}
) {
    return (
        <Helmet>
            <meta
                name="description"
                content={
                    props?.description ??
                    "Home of the osu!droid Elaina PP Project site."
                }
            />
            <title>{props?.title ?? "PP Board - Home"}</title>
        </Helmet>
    );
}
