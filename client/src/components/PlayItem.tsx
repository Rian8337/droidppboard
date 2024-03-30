import {
    PPEntry,
    PrototypePPEntry,
    TopPPEntry,
    TopPrototypePPEntry,
} from "app-structures";
import "../styles/play-list.css";
import { Util } from "../Util";

type Entry = PPEntry | PrototypePPEntry | TopPPEntry | TopPrototypePPEntry;

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

    if (!isTop(play)) {
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
                    {play.combo}x | {play.accuracy}% | <>{play.miss} ❌</>
                    {play.speedMultiplier ? (
                        <>
                            {" "}
                            | x{play.speedMultiplier.toFixed(2)} speed
                            multiplier
                        </>
                    ) : null}
                </p>

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
                    {play.pp}pp
                </p>
                {description ? (
                    <p className="pp-description">{description}</p>
                ) : null}
            </div>
        </li>
    );
}
