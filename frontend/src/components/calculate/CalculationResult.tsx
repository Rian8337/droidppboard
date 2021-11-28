import { CalculationParams, CalculationResult } from "app-structures";
import { motion } from "framer-motion";
import "../../styles/modules/components/CalculationResult.module.css";
import BeatmapCalculationResult from "./BeatmapCalculationResult";
import DifficultyCalculationResult from "./DifficultyCalculationResult";
import ParameterCalculationResult from "./ParameterCalculationResult";
import PerformanceCalculationResult from "./PerformanceCalculationResult";
import StrainGraphCalculationResult from "./StrainGraphCalculationResult";

export default function CalculationResult(props: {
    params: CalculationParams;
    result: CalculationResult;
}) {
    const { params, result } = props;
    const { beatmap, difficulty, performance, strainGraph } = result;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div>
                <h4>Calculation Result</h4>
                <BeatmapCalculationResult beatmap={beatmap} />
                <br />
                <ParameterCalculationResult
                    params={params}
                    beatmap={beatmap}
                    estimated={result.estimated}
                />
                <br />
                <DifficultyCalculationResult difficulty={difficulty} />
                <br />
                <PerformanceCalculationResult performance={performance} />
                {strainGraph.droid && strainGraph.osu ? (
                    <StrainGraphCalculationResult strainGraph={strainGraph} />
                ) : (
                    ""
                )}
            </div>
        </motion.div>
    );
}
