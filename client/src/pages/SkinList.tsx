import { motion } from "framer-motion";
import { useContext } from "react";
import "../styles/table-listing.css";
import Head from "../components/Head";
import Paging from "../components/Paging";
import SearchBar from "../components/SearchBar";
import SkinTable from "../components/skin/SkinTable";
import SkinListNavigator from "../hooks/SkinListNavigator";

export default function SkinList() {
    const ctx = useContext(SkinListNavigator);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
        >
            <Head
                description="View available player skins."
                title="PP Board - Player Skins"
            />
            <h2 className="subtitle">Player Skins</h2>
            <h3 className="prototype-description">
                This page is out of scope of this website. However, it was made
                so that the skin command in{" "}
                <a
                    href="https://github.com/Rian8337/Alice"
                    target="_blank"
                    rel="noreferrer"
                >
                    Alice
                </a>{" "}
                has a more meaningful feature and as a response to the{" "}
                <a
                    href="https://tsukushi.site"
                    target="_blank"
                    rel="noreferrer"
                >
                    old skin site
                </a>{" "}
                dying.
            </h3>
            <h3 className="description">
                Click/tap on a skin&apos;s name to visit its preview page.
            </h3>
            <SearchBar
                state={ctx}
                searchPlaceholder="Search skins..."
                submitPlaceholder="Search"
            />
            <Paging state={ctx} />
            <SkinTable />
            {ctx.data.length > 0 && <Paging state={ctx} />}
        </motion.div>
    );
}
