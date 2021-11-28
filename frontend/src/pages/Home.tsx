import { motion } from "framer-motion";
import DiscordServer from "../components/DiscordServer";
import "../styles/modules/routes/Home.module.css";

export default function Home() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="description">
                <h3>About</h3>
                <p>
                    This is one of my fun project for our small osu!droid
                    Discord community. If you like it consider to support this
                    poor college student uwu
                </p>
                <hr />
                <h3>Relevant Links</h3>
                <ul>
                    <li>
                        <a
                            href="https://paypal.me/NguyenNgocDang"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Donation (PayPal only)
                        </a>
                    </li>
                    <li>
                        <DiscordServer />
                    </li>
                </ul>
                <p>
                    You can PM me through Discord (-Nero Yuki-#1174) if you want
                    to donate with different mean
                </p>
                <hr />
                <h3>Benefits</h3>
                <ul>
                    <li>
                        Actually, there is none lol, but it helps me, and I will
                        put a list of donor here I guess XD
                    </li>
                    <li>I don&apos;t know lol</li>
                </ul>
                <hr />
                <h3>Donor List</h3>
                <ul>
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
                </ul>
            </div>
        </motion.div>
    );
}
