import { ICalculationResult } from "app-structures";
import "../../styles/table-calculation-result.css";

export default function StrainGraphCalculationResult(props: {
    strainGraph: ICalculationResult["strainGraph"];
}) {
    const { strainGraph } = props;

    return (
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
    );
}
