import { IUserBind, IPrototypePP } from "app-structures";
import { useNavigate } from "react-router-dom";
import { Util } from "../../Util";
import "../../styles/table-listing.css";

export default function LeaderboardItem(props: {
    data: IUserBind | IPrototypePP;
    page: number;
    index: number;
}) {
    const user = props.data;
    const navigate = useNavigate();

    return (
        <tr>
            <td>{(props.page - 1) * 50 + props.index + 1}</td>
            <td>{user.uid}</td>
            <td
                className="assign-left"
                onClick={(event) => {
                    event.preventDefault();
                    navigate(
                        `/${
                            Util.isPrototype(user) ? "prototype/" : ""
                        }profile/${user.uid}`
                    );
                }}
            >
                {user.username}
            </td>
            <td>
                {Util.isPrototype(user)
                    ? user.prevpptotal.toFixed(2)
                    : user.playc}
            </td>
            <td>{user.pptotal.toFixed(2)}</td>
            {Util.isPrototype(user) ? (
                <td>{(user.pptotal - user.prevpptotal).toFixed(2)}</td>
            ) : null}
        </tr>
    );
}
