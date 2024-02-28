import { ICalculationParams, ICalculationResult } from "app-structures";
import { motion } from "framer-motion";
import BeatmapCalculationResult from "./BeatmapCalculationResult";
import DifficultyCalculationResult from "./DifficultyCalculationResult";
import ParameterCalculationResult from "./ParameterCalculationResult";
import PerformanceCalculationResult from "./PerformanceCalculationResult";

export default function CalculationResult(props: {
    params: ICalculationParams;
    result: ICalculationResult;
}) {
    const { params, result } = props;
    const { beatmap, difficulty, performance } = result;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            <h4>Calculation Result</h4>
            <BeatmapCalculationResult beatmap={beatmap} />
            <br />
            <ParameterCalculationResult params={params} beatmap={beatmap} />
            <br />
            <DifficultyCalculationResult difficulty={difficulty} />
            <br />
            <PerformanceCalculationResult performance={performance} />
        </motion.div>
    );
}
