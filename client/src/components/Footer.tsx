import DiscordServer from "./DiscordServer";

export default function Footer() {
    return (
        <footer>
            <p>osu!droid Elaina PP Project Site</p>
            <p>&copy; {new Date().getFullYear()} Rian8337</p>
            <DiscordServer />
        </footer>
    );
}
