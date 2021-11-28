import { CalculationResult } from "app-structures";

export default function StrainGraphCalculationResult(props: {
    strainGraph: CalculationResult["strainGraph"];
}) {
    const { strainGraph } = props;

    return (
        <div>
            <figure className="strain-graph">
                <figcaption>Droid Strain Graph</figcaption>
                <img
                    src={"data:image/png;base64," + strainGraph.droid}
                    alt="Droid Strain Graph"
                />
                <br />
                <figcaption>PC Strain Graph</figcaption>
                <img
                    src={"data:image/png;base64," + strainGraph.osu}
                    alt="PC Strain Graph"
                />
            </figure>
        </div>
    );
}
