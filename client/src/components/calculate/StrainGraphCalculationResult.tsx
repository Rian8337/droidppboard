import { ICalculationResult } from "app-structures";
import "../../styles/table-calculation-result.css";
import { useEffect, useState } from "react";

function createObjectURL(data: readonly number[]): string {
    return URL.createObjectURL(
        new Blob([new Uint8Array(data)], {
            type: "image/png",
        })
    );
}

export default function StrainGraphCalculationResult(props: {
    strainGraph: ICalculationResult["strainGraph"];
}) {
    const { strainGraph } = props;

    const [droidUrl, setDroidUrl] = useState<string | null>(null);
    const [osuUrl, setOsuUrl] = useState<string | null>(null);

    useEffect(() => {
        const url = createObjectURL(strainGraph.droid);

        setDroidUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [strainGraph.droid]);

    useEffect(() => {
        const url = createObjectURL(strainGraph.osu);

        setOsuUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [strainGraph.osu]);

    if (!droidUrl || !osuUrl) {
        return <p>Loading graph...</p>;
    }

    return (
        <figure className="strain-graph">
            <figcaption>Droid Strain Graph</figcaption>
            <img src={droidUrl} alt="Droid Strain Graph" />
            <br />
            <br />
            <figcaption>PC Strain Graph</figcaption>
            <img src={osuUrl} alt="PC Strain Graph" />
        </figure>
    );
}
