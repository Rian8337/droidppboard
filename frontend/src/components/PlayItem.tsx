import {
    PPEntry,
    PrototypePPEntry,
    TopPPEntry,
    TopPrototypePPEntry,
} from "app-structures";
import { Mod, ModUtil } from "osu-droid";
import "../styles/modules/components/PlayItem.module.css";

type Entry = PPEntry | PrototypePPEntry | TopPPEntry | TopPrototypePPEntry;

export default function PlayItem(props: { data: Entry; index: number }) {
    const play = props.data;

    const isPrototype = (play: Entry): play is PrototypePPEntry => {
        return "prevPP" in play;
    };

    const isTop = (play: Entry): play is TopPPEntry => {
        return "username" in play;
    };

    const isTopPrototype = (play: Entry): play is TopPrototypePPEntry => {
        return isTop(play) && isPrototype(play);
    };

    const getPPDescription = () => {
        // Would rather use a switch case here, but TypeScript being TypeScript
        const weight: number = Math.pow(0.95, props.index);

        if (isTopPrototype(play) || isPrototype(play)) {
            const diff: number = play.pp - play.prevPP;

            let str: string = `(${diff >= 0 ? "+" : ""}${diff.toFixed(2)}pp`;

            if (isPrototype(play) && !isTopPrototype(play)) {
                str += `; ${(play.pp * weight).toFixed(
                    2
                )}pp; weighted ${Math.round(100 * weight)}%`;
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

    const description = getPPDescription();

    const displayMods: Mod[] = ModUtil.pcStringToMods(play.mods);

    return (
        <li className="play-item">
            {play.title}
            {isTop(play) || isTopPrototype(play) ? (
                <span className="title-note"> played by {play.username}</span>
            ) : (
                ""
            )}
            <p className="play-info">
                {play.combo}x | {play.accuracy}% | {play.miss} ❌
            </p>

            <div
                className={
                    isPrototype(play) ? "prototype-mod-list" : "mod-list"
                }
            >
                {displayMods.map((m) => {
                    return (
                        <img
                            key={m.acronym}
                            className="mod-image"
                            src={
                                // eslint-disable-next-line @typescript-eslint/no-var-requires
                                require("../icons/mods/" + m.acronym + ".png")
                                    .default
                            }
                            alt={m.acronym}
                            title={m.name}
                        />
                    );
                }) || (
                    <img
                        className="mod-image"
                        // eslint-disable-next-line @typescript-eslint/no-var-requires
                        src={require("../icons/mods/NM.png").default}
                        alt="NM"
                        title="NoMod"
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
        </li>
    );
}
