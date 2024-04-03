import "../styles/main.css";

export default function InGameDescription() {
    return (
        <div className="prototype-description">
            What you are seeing is the to-be in-game pp in osu!droid version
            1.7.3, which only includes ranked and approved beatmaps, but counts
            up to top 100 scores instead of top 75.
            <br />
            <br />
            It is important to remember that this is calculated using
            osu!&apos;s beatmap listing, whereas the final version will be
            calculated using Chimu&apos;s beatmap listing. There will be
            differences in availability of beatmaps, which will affect the
            amount of beatmaps that award pp.
            <br />
            <br />
            Please note that the live and local pp values are not final until
            this message is removed.
        </div>
    );
}
