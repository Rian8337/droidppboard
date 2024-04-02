import { IUserBind, IPrototypePP, IInGamePP } from "app-structures";
import { Link } from "react-router-dom";
import { Util } from "../../Util";
import "../../styles/table-listing.css";

export default function LeaderboardItem(props: {
    data: IUserBind | IPrototypePP | IInGamePP;
    page: number;
    index: number;
}) {
    const user = props.data;

    return (
        <tr>
            <td>{(props.page - 1) * 50 + props.index + 1}</td>
            <td>{user.uid}</td>
            <td className="assign-left clickable">
                <Link
                    to={`/${
                        Util.isInGame(user)
                            ? "ingame/"
                            : Util.isPrototype(user)
                            ? "prototype/"
                            : ""
                    }profile/${user.uid}`}
                >
                    {user.username}
                </Link>
            </td>
            <td>
                {Util.isPrototype(user) || Util.isInGame(user)
                    ? user.prevpptotal.toFixed(2)
                    : user.playc}
            </td>
            <td>{user.pptotal.toFixed(2)}</td>
            {Util.isPrototype(user) || Util.isInGame(user) ? (
                <td>{(user.pptotal - user.prevpptotal).toFixed(2)}</td>
            ) : null}
        </tr>
    );
}
