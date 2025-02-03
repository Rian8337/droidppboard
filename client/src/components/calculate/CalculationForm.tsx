import { FormEvent, useContext } from "react";
import MainCalculationContext from "../../hooks/MainCalculationContext";
import PrototypeCalculationContext from "../../hooks/PrototypeCalculationContext";
import { CalculationSetting } from "../../interfaces/CalculationSetting";
import "../../styles/calculate.css";

export default function CalculationForm(props: { prototype: boolean }) {
    const ctx: CalculationSetting = useContext(
        props.prototype ? PrototypeCalculationContext : MainCalculationContext
    );

    function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        ctx.setErrorMessage(undefined);
        ctx.setResult(undefined);

        const getValue = (index: number): string => {
            return (event.currentTarget[index] as HTMLInputElement).value;
        };

        ctx.setParams({
            beatmaplink: getValue(1),
            mods: getValue(2),
            accuracy: parseFloat(getValue(3)),
            combo: parseInt(getValue(4)),
            misses: parseInt(getValue(5)),
            speedmultiplier: parseFloat(getValue(6)),
            forcecs: parseFloat(getValue(7)),
            forcear: parseFloat(getValue(8)),
            forceod: parseFloat(getValue(9)),
        });

        fetch(
            `/api/ppboard/${
                props.prototype ? "prototype/" : ""
            }calculatebeatmap`,
            {
                method: "POST",
                body: new FormData(event.currentTarget),
            }
        )
            .then(async (res) => {
                if (res.status === 429) {
                    throw new Error(
                        "You are being rate limited. Please try again later"
                    );
                }

                const json = await res.json();

                if (!res.ok) {
                    throw new Error(json.message);
                }

                return json;
            })
            .then((rawData) => {
                ctx.setResult(rawData);
            })
            .catch((e: Error) => {
                ctx.setErrorMessage(e.message);
            });
    }

    return (
        <form
            className="calculate-form"
            onSubmit={onSubmit}
            method="post"
            encType="multipart/form-data"
        >
            <label htmlFor="beatmapfile">
                <p>Beatmap File</p>
                Use this if you want to calculate an .osu file. Useful if the
                beatmap is not available in osu! beatmap listing.
                <br />
                Either this or beatmap link/ID must be provided.
                <br />
                If both options are provided, this option is prioritized.
            </label>
            <br />
            <input
                className="parameter"
                type="file"
                accept=".osu"
                name="beatmapfile"
            />
            <br />
            <label htmlFor="beatmaplink">
                <p>Beatmap link or ID</p>
                Use this if you want to directly retrieve a beatmap from osu!
                beatmap listing.
                <br />
                Either this or beatmap file must be provided.
            </label>
            <br />
            <input
                className="parameter"
                type="text"
                name="beatmaplink"
                placeholder="Insert beatmap link or ID..."
                defaultValue={ctx.params?.beatmaplink || ""}
            />
            <br />
            <label htmlFor="mods">
                <p>Mods</p>
                Optional. Defaults to none.
            </label>
            <br />
            <input
                className="parameter"
                type="text"
                name="mods"
                placeholder="Insert mods..."
                defaultValue={ctx.params?.mods || ""}
            />
            <br />
            <label htmlFor="accuracy">
                <p>Accuracy</p>
                Optional, range from 1-100. Defaults to 100.
            </label>
            <br />
            <input
                className="parameter"
                type="text"
                name="accuracy"
                placeholder="Insert accuracy..."
                defaultValue={ctx.params?.accuracy || ""}
            />
            <br />
            <label htmlFor="combo">
                <p>Combo</p>
                Optional, range from 1 to the beatmap&apos;s maximum combo.
                <br />
                Defaults to the beatmap&apos;s maximum combo.
            </label>
            <br />
            <input
                className="parameter"
                type="text"
                name="combo"
                placeholder="Insert combo..."
                defaultValue={ctx.params?.combo || ""}
            />
            <br />
            <label htmlFor="misses">
                <p>Misses</p>
                Optional. Defaults to 0.
            </label>
            <br />
            <input
                className="parameter"
                type="text"
                name="misses"
                placeholder="Insert amount of misses..."
                defaultValue={ctx.params?.misses || ""}
            />
            <br />
            <label htmlFor="speedmultiplier">
                <p>Speed Multiplier</p>
                Optional, range from 0.5 to 2. Defaults to 1.
            </label>
            <br />
            <input
                className="parameter"
                type="text"
                name="speedmultiplier"
                placeholder="Insert speed multiplier..."
                defaultValue={ctx.params?.speedmultiplier || ""}
            />
            <br />
            <label htmlFor="forcecs">
                <p>Force CS</p>
                Optional, range from 0 to 11. Defaults to none.
                <br />
                If specified, sets the beatmap&apos;s CS to the specified value
                ignoring any effect from mods.
            </label>
            <br />
            <input
                className="parameter"
                type="text"
                name="forcecs"
                placeholder="Insert force CS..."
                defaultValue={ctx.params?.forcecs || ""}
            />
            <br />
            <label htmlFor="forcear">
                <p>Force AR</p>
                Optional, range from 0 to 12.5. Defaults to none.
                <br />
                If specified, sets the beatmap&apos;s AR to the specified value
                ignoring any effect from mods and speed multiplier.
            </label>
            <br />
            <input
                className="parameter"
                type="text"
                name="forcear"
                placeholder="Insert force AR..."
                defaultValue={ctx.params?.forcear || ""}
            />
            <br />
            <label htmlFor="forceod">
                <p>Force OD</p>
                Optional, range from 0 to 11. Defaults to none.
                <br />
                If specified, sets the beatmap&apos;s OD to the specified value
                ignoring any effect from mods and speed multiplier.
            </label>
            <br />
            <input
                className="parameter"
                type="text"
                name="forceod"
                placeholder="Insert force OD..."
                defaultValue={ctx.params?.forceod || ""}
            />
            <input type="hidden" name="generatestrainchart" value="1" />
            <br />
            <input
                className="submit"
                type="submit"
                value="Calculate"
                disabled={
                    // Don't enable button when calculation is in progress
                    !ctx.errorMessage &&
                    ctx.params &&
                    (!ctx.params || !ctx.result)
                }
            />
        </form>
    );
}
