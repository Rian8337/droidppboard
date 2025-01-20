import { motion } from "framer-motion";
import DiscordServer from "../components/DiscordServer";
import "../styles/main.css";
import "../styles/about.css";

export default function Home() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="description"
        >
            <h3>About</h3>
            <p>
                This is the center testing ground for the osu!droid PP Project.
                If you like it consider to support this poor college student uwu
            </p>
            <hr />
            <h3>Relevant Links</h3>
            <ul>
                <li>
                    Donation{" "}
                    <a
                        href="https://paypal.me/Rian8337"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        (PayPal){" "}
                    </a>
                    <a
                        href="https://ko-fi.com/rian8337"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        (Ko-fi)
                    </a>
                </li>
                <li>
                    <DiscordServer />
                </li>
            </ul>
            <p>
                You can PM me through Discord (@rian8337) if you want to donate
                with different mean
            </p>
            <hr />
            <h3>Benefits</h3>
            <ul>
                <li>
                    Actually, there is none lol, but it helps me, and I will put
                    a list of donor here I guess XD
                </li>
                <li>I don&apos;t know lol</li>
            </ul>
            <hr />
            <h3>Donor List</h3>
            <ul>
                <ul>
                    To Nero:
                    <li>Tsukushi - 1.32$ - Thanks Replay Uploader uwu</li>
                    <li>Megastore - 4.00$ - Thank brolex bruh</li>
                    <li>ArtX - 9.99$ - owo I love you owo</li>
                    <li>
                        Rian8337 - 180000rp (12.64$) in Steam Wallet - I can
                        have more game now owowo
                    </li>
                    <li>
                        quantumvortex - 14.00$ in Steam Items - Thanks map
                        validator for even more game owo
                    </li>
                    <li>Veno - 15.00$ - ❤️❤️❤️, no homo :3</li>
                    <li>Imagine Blaze - 7.77$ - much appreciated man owo</li>
                    <li>AkazaAkari - 10.00$ - thank you veteran player ❤️</li>
                    <li>
                        yuki - 100.00 NZD - that&apos;s a ton of money! Thank
                        you ❤️
                    </li>
                </ul>
            </ul>
        </motion.div>
    );
}
