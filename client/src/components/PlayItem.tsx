import {
    OldPPEntry,
    PPEntry,
    PrototypePPEntry,
    TopOldPPEntry,
    TopPPEntry,
    TopPrototypePPEntry,
} from "app-structures";
import "../styles/play-list.css";
import { Util } from "../Util";

type Entry =
    | OldPPEntry
    | PPEntry
    | PrototypePPEntry
    | TopOldPPEntry
    | TopPPEntry
    | TopPrototypePPEntry;

const isPrototype = (play: Entry): play is PrototypePPEntry => {
    return "prevPP" in play;
};

const isTop = (play: Entry): play is TopPPEntry => {
    return "username" in play;
};

const isTopPrototype = (play: Entry): play is TopPrototypePPEntry => {
    return isTop(play) && isPrototype(play);
};

const getPPDescription = (play: Entry, index: number) => {
    // Would rather use a switch case here, but TypeScript being TypeScript
    const weight: number = Math.pow(0.95, index);

    if (isTopPrototype(play) || isPrototype(play)) {
        const diff: number = play.pp - play.prevPP;

        let str: string = `(${diff >= 0 ? "+" : ""}${diff.toFixed(2)}pp`;

        if (isPrototype(play) && !isTopPrototype(play)) {
            str += `; ${(play.pp * weight).toFixed(2)}pp; weighted ${Math.round(
                100 * weight
            )}%`;
        }

        return str + ")";
    } else if (!isTop(play)) {
        return `(${(play.pp * weight).toFixed(2)}pp; weighted ${Math.round(
            100 * weight
        )}%)`;
    } else {
        return "";
    }
};

export default function PlayItem(props: { data: Entry; index: number }) {
    const play = props.data;
    const description = getPPDescription(play, props.index);

    return (
        <li className="play-item">
            <div className="play-item-container">
                <p className="title">{play.title}</p>
                {isTop(play) || isTopPrototype(play) ? (
                    <span className="title-note">
                        {" "}
                        played by {play.username}
                    </span>
                ) : (
                    ""
                )}
                <p className="play-info">
                    {play.combo}x | {play.accuracy}% |{" "}
                    {isPrototype(play) && typeof play.hit300 === "number" ? (
                        <>
                            [{play.hit300}/{play.hit100}/{play.hit50}/
                            {play.miss}]
                        </>
                    ) : (
                        <>{play.miss} ❌</>
                    )}
                </p>
                {isPrototype(play) ? (
                    <>
                        <p className="play-info">
                            OD {play.overallDifficulty.toFixed(2)}
                            {typeof play.calculatedUnstableRate === "number" ? (
                                <>
                                    {" "}
                                    | {play.calculatedUnstableRate.toFixed(
                                        2
                                    )}{" "}
                                    calculated UR
                                </>
                            ) : (
                                <></>
                            )}{" "}
                            | {play.estimatedUnstableRate.toFixed(2)} estimated
                            UR |{" "}
                            {typeof play.estimatedSpeedUnstableRate === "number"
                                ? play.estimatedSpeedUnstableRate.toFixed(2)
                                : Infinity}{" "}
                            estimated speed UR
                            {typeof play.speedNoteCount === "number" ? (
                                <>
                                    {typeof play.estimatedSpeedUnstableRate ===
                                    "number" ? (
                                        <> | </>
                                    ) : (
                                        <></>
                                    )}
                                    {play.speedNoteCount.toFixed(2)} speed note
                                    count
                                </>
                            ) : (
                                <></>
                            )}
                        </p>
                        <p className="play-info">
                            <b>Old</b>: {play.prevPP} pp ({play.prevAim} aim,{" "}
                            {play.prevTap} tap, {play.prevAccuracy} accuracy,{" "}
                            {play.prevVisual} visual)
                        </p>
                        <p className="play-info">
                            <b>New</b>: {play.pp} pp ({play.newAim} aim,{" "}
                            {play.newTap} tap, {play.newAccuracy} accuracy,{" "}
                            {play.newVisual} visual)
                        </p>
                        {/* <p className="play-info">
                            {play.aimNoteCount.toFixed(2)} aim note count,{" "}
                            {play.twoHandedNoteCount.toFixed(2)} two-handed note
                            count
                            {play.twoHandedNoteCount / play.aimNoteCount > 0.1
                                ? ", assumed two handed"
                                : ""}
                        </p> */}
                        <p className="play-info">
                            Slider cheese penalties:{" "}
                            {play.aimSliderCheesePenalty.toFixed(2)} aim,{" "}
                            {play.visualSliderCheesePenalty.toFixed(2)} visual
                        </p>
                    </>
                ) : (
                    <></>
                )}
                <div
                    className={
                        isPrototype(play) ? "prototype-mod-list" : "mod-list"
                    }
                >
                    {Util.parseMods(play.mods)?.map((m) => {
                        return (
                            <img
                                key={m}
                                className="mod-image"
                                src={
                                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                                    require("../icons/mods/" + m + ".png")
                                }
                                alt={m}
                                title={m}
                            />
                        );
                    }) || (
                        <img
                            className="mod-image"
                            // eslint-disable-next-line @typescript-eslint/no-var-requires
                            src={require("../icons/mods/NM.png")}
                            alt="NM"
                            title="NM"
                        />
                    )}
                </div>
                <p
                    className={
                        isTop(play) && !isPrototype(play)
                            ? "pp-without-description"
                            : "pp-with-description"
                    }
                >
                    {isPrototype(play)
                        ? `${play.prevPP}pp → ${play.pp}pp`
                        : `${play.pp}pp`}
                </p>
                {description ? (
                    <p className="pp-description">{description}</p>
                ) : null}
            </div>
        </li>
    );
}
