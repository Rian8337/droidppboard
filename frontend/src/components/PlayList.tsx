import {
    PPEntry,
    PrototypePPEntry,
    TopPPEntry,
    TopPrototypePPEntry,
} from "app-structures";
import "../styles/modules/components/PlayList.module.css";
import PlayItem from "./PlayItem";

export default function PlayList(props: {
    data: PPEntry[] | PrototypePPEntry[] | TopPPEntry[] | TopPrototypePPEntry[];
}) {
    const { data } = props;

    return (
        <ul className="play-list">
            {data.map((v, i) => {
                let key: string = `${v.title}:${v.pp}`;

                if ("username" in v) {
                    key += ":" + v.username;
                }

                return <PlayItem key={key} data={v} index={i} />;
            })}
        </ul>
    );
}
