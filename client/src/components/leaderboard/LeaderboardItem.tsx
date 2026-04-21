import { IPrototypePP } from "app-structures";
import { useContext } from "react";
import { Link } from "react-router-dom";
import PrototypeSelectorNavigator from "../../hooks/PrototypeSelectorNavigator";
import "../../styles/table-listing.css";
import { Util } from "../../Util";

export default function LeaderboardItem(props: {
    data: IPrototypePP;
    page: number;
    index: number;
}) {
    const prototypeSelectorCtx = useContext(PrototypeSelectorNavigator);
    const user = props.data;

    const diff = user.localPPTotal - (user.masterPPTotal ?? user.livePPTotal);
    const color = Util.getDiffColor(diff);

    return (
        <tr>
            <td>{(props.page - 1) * 50 + props.index + 1}</td>
            <td className="assign-left clickable">
                <Link
                    className="content-ellipsis"
                    to={`/prototype/profile/${user.uid}${
                        prototypeSelectorCtx.currentRework?.type
                            ? `/${prototypeSelectorCtx.currentRework.type}`
                            : ""
                    }`}
                >
                    [{user.uid}] {user.username}
                </Link>
            </td>
            <td>{user.livePPTotal.toFixed(2)}</td>
            {user.masterPPTotal !== undefined && (
                <td>{user.masterPPTotal.toFixed(2)}</td>
            )}
            <td>
                <b>{user.localPPTotal.toFixed(2)}</b>
            </td>
            <td style={{ color: `rgb(${color})` }}>{diff.toFixed(2)}</td>
        </tr>
    );
}
