import { ICalculationResult } from "app-structures";
import "../../styles/table-calculation-result.css";
import { useEffect, useState } from "react";

export default function StrainGraphCalculationResult(props: {
    strainGraph: ICalculationResult["strainGraph"];
}) {
    const { strainGraph } = props;

    const [droidUrl, setDroidUrl] = useState<string | null>(null);
    const [osuUrl, setOsuUrl] = useState<string | null>(null);

    function createObjectURL(data: readonly number[]): string {
        return URL.createObjectURL(
            new Blob([new Uint8Array(data)], {
                type: "image/png",
            })
        );
    }

    useEffect(() => {
        setDroidUrl(createObjectURL(strainGraph.droid));

        return () => {
            if (droidUrl) {
                URL.revokeObjectURL(droidUrl);
            }
        };
    }, [droidUrl, strainGraph.droid]);

    useEffect(() => {
        setOsuUrl(createObjectURL(strainGraph.osu));

        return () => {
            if (osuUrl) {
                URL.revokeObjectURL(osuUrl);
            }
        };
    }, [osuUrl, strainGraph.osu]);

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
