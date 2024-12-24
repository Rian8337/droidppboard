import { IPrototypePP } from "app-structures";
import { Link } from "react-router-dom";
import "../../styles/table-listing.css";
import PrototypeSelectorNavigator from "../../hooks/PrototypeSelectorNavigator";
import { useContext } from "react";

export default function LeaderboardItem(props: {
    data: IPrototypePP;
    page: number;
    index: number;
}) {
    const prototypeSelectorCtx = useContext(PrototypeSelectorNavigator);
    const user = props.data;

    return (
        <tr>
            <td>{(props.page - 1) * 50 + props.index + 1}</td>
            <td>{user.uid}</td>
            <td className="assign-left clickable">
                <Link
                    to={`/prototype/profile/${user.uid}${
                        prototypeSelectorCtx.currentRework?.type
                            ? `/${prototypeSelectorCtx.currentRework.type}`
                            : ""
                    }`}
                >
                    {user.username}
                </Link>
            </td>
            <td>{user.prevpptotal.toFixed(2)}</td>
            <td>{user.pptotal.toFixed(2)}</td>
            <td>{(user.pptotal - user.prevpptotal).toFixed(2)}</td>
        </tr>
    );
}
