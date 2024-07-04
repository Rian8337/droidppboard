import { motion } from "framer-motion";
import CalculationForm from "./CalculationForm";
import CalculationResult from "./CalculationResult";
import Head from "../Head";
import { CalculationSetting } from "../../interfaces/CalculationSetting";
import PrototypeDisclaimer from "../PrototypeDisclaimer";
import { useContext } from "react";
import PrototypeCalculationContext from "../../hooks/PrototypeCalculationContext";
import MainCalculationContext from "../../hooks/MainCalculationContext";
import "../../styles/main.css";
import "../../styles/calculate.css";

export default function CalculateBeatmap(props: { prototype: boolean }) {
    const ctx: CalculationSetting = useContext(
        props.prototype ? PrototypeCalculationContext : MainCalculationContext
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
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
            {props.prototype ? <PrototypeDisclaimer /> : null}
            <h4>Calculation Form</h4>
            <CalculationForm {...props} />
            {ctx.errorMessage ? (
                <h3 className="error-message">Error: {ctx.errorMessage}.</h3>
            ) : ctx.params && ctx.result ? (
                <>
                    <hr />
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <CalculationResult
                            params={ctx.params!}
                            result={ctx.result}
                        />
                    </motion.div>
                </>
            ) : ctx.params ? (
                <motion.h3
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ textAlign: "center" }}
                >
                    Calculating Beatmap...
                </motion.h3>
            ) : null}
        </motion.div>
    );
}
