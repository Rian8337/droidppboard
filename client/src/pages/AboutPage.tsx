import { discordUrl } from "../utils/links";
import pageStyles from "./Page.module.css";
import styles from "./AboutPage.module.css";

interface Donation {
    readonly donor: string;
    readonly what: string;
}

/** Who donated, in the order they did, by whom the donation went to. */
const donations: readonly { readonly to: string; readonly donors: readonly Donation[] }[] = [
    {
        to: "Nero",
        donors: [
            { donor: "Tsukushi", what: "1.32$ - Thanks Replay Uploader uwu" },
            { donor: "Megastore", what: "4.00$ - Thank brolex bruh" },
            { donor: "ArtX", what: "9.99$ - owo I love you owo" },
            {
                donor: "Rian8337",
                what: "180000rp (12.64$) in Steam Wallet - I can have more game now owowo",
            },
            {
                donor: "quantumvortex",
                what: "14.00$ in Steam Items - Thanks map validator for even more game owo",
            },
            { donor: "Veno", what: "15.00$ - ❤️❤️❤️, no homo :3" },
            { donor: "Imagine Blaze", what: "7.77$ - much appreciated man owo" },
            { donor: "AkazaAkari", what: "10.00$ - thank you veteran player ❤️" },
            { donor: "yuki", what: "100.00 NZD - that's a ton of money! Thank you ❤️" },
        ],
    },
];

/** What the site is, how to support it, and who did. */
export function AboutPage() {
    return (
        <div className={`${pageStyles.page} ${pageStyles.narrow}`}>
            <section className={styles.section}>
                <h2 className={styles.heading}>About</h2>
                <p>
                    This is the center testing ground for the osu!droid PP Project. If you like it
                    consider to support this poor college student uwu
                </p>
            </section>
            <section className={styles.section}>
                <h2 className={styles.heading}>Relevant links</h2>
                <ul>
                    <li>
                        Donation:{" "}
                        <a
                            href="https://paypal.me/Rian8337"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            PayPal
                        </a>
                        {" · "}
                        <a
                            href="https://ko-fi.com/rian8337"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Ko-fi
                        </a>
                    </li>
                    <li>
                        <a href={discordUrl} target="_blank" rel="noopener noreferrer">
                            osu!droid Discord server
                        </a>
                    </li>
                </ul>
                <p>
                    You can PM me through Discord (@rian8337) if you want to donate with different
                    mean.
                </p>
            </section>
            <section className={styles.section}>
                <h2 className={styles.heading}>Benefits</h2>
                <ul>
                    <li>
                        Actually, there is none lol, but it helps me, and I will put a list of donor
                        here I guess XD
                    </li>
                    <li>I don&apos;t know lol</li>
                </ul>
            </section>
            <section className={styles.section}>
                <h2 className={styles.heading}>Donor list</h2>
                {donations.map(({ to, donors }) => (
                    <div key={to}>
                        <p>To {to}:</p>
                        <ul>
                            {donors.map(({ donor, what }) => (
                                <li key={donor}>
                                    <strong>{donor}</strong> - {what}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </section>
        </div>
    );
}
