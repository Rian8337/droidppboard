import { motion } from "framer-motion";
import CalculationForm from "./CalculationForm";
import CalculationResult from "./CalculationResult";
import Head from "../Head";
import "../../styles/modules/components/calculate/CalculateBeatmap.module.css";
import { CalculationSetting } from "../../interfaces/CalculationSetting";
import PrototypeDescription from "../PrototypeDescription";
import { useContext } from "react";
import PrototypeCalculationContext from "../../contexts/PrototypeCalculationContext";
import MainCalculationContext from "../../contexts/MainCalculationContext";

export default function CalculateBeatmap(props: { prototype: boolean }) {
    const ctx: CalculationSetting = useContext(
        props.prototype ? PrototypeCalculationContext : MainCalculationContext
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div>
                <Head
                    description={`Calculate a beatmap with respect to ${
                        props.prototype ? "the prototype version of " : ""
                    }Elaina PP Project.`}
                    title={`PP Board - Calculate Beatmap ${
                        props.prototype ? "Prototype " : ""
                    }PP`}
                />
                <h2 className="subtitle">
                    Calculate Beatmap {props.prototype ? "Prototype " : ""}PP
                </h2>
                {props.prototype ? <PrototypeDescription /> : null}
                <h4>Calculation Form</h4>
                <CalculationForm {...props} />
                {ctx.errorMessage ? (
                    <h3 className="error-message">
                        Error: {ctx.errorMessage}.
                    </h3>
                ) : ctx.params && ctx.result ? (
                    <div>
                        <hr />
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <CalculationResult
                                params={ctx.params!}
                                result={ctx.result}
                            />
                        </motion.div>
                    </div>
                ) : ctx.params ? (
                    <motion.h3
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h3 style={{ textAlign: "center" }}>
                            Calculating Beatmap...
                        </h3>
                    </motion.h3>
                ) : null}
            </div>
        </motion.div>
    );
}
