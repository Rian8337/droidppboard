import { IPlayerSkin } from "app-structures";
import { useNavigate } from "react-router-dom";
import "../../styles/table-listing.css";
import "../../styles/input.css";

export default function SkinItem(props: {
    data: IPlayerSkin;
    page: number;
    index: number;
}) {
    const skin = props.data;
    const navigate = useNavigate();

    return (
        <tr>
            <td>{(props.page - 1) * 50 + props.index + 1}</td>
            <td
                className="clickable"
                onClick={(event) => {
                    event.preventDefault();
                    navigate(`/skin/${skin.discordid}/${skin.name}`);
                }}
            >
                {skin.name}
            </td>
            <td className="assign-left">
                {skin.description || "No description"}
            </td>
        </tr>
    );
}
