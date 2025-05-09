import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Footer from "./components/Footer";
import Head from "./components/Head";
import Header from "./components/Header";
import Menu from "./components/menu/Menu";
import Home from "./pages/Home";
import Whitelist from "./pages/Whitelist";
import MainCalculateBeatmap from "./pages/MainCalculateBeatmap";
import PrototypeLeaderboard from "./pages/PrototypeLeaderboard";
import PrototypePlayerProfile from "./pages/PrototypePlayerProfile";
import PrototypeTopPlays from "./pages/PrototypeTopPlays";
import PrototypeCalculateBeatmap from "./pages/PrototypeCalculateBeatmap";
import ScrollToTop from "./components/ScrollToTop";
import SkinList from "./pages/SkinList";
import SkinPreview from "./pages/SkinPreview";
import MatchHistory from "./pages/MatchHistory";

function App() {
    const location = useLocation();

    return (
        <>
            <Head />
            <Header />
            <hr />
            <Menu />
            <hr />
            <AnimatePresence exitBeforeEnter>
                <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<Home />} />
                    <Route path="/whitelist" element={<Whitelist />} />
                    <Route
                        path="/calculate"
                        element={<MainCalculateBeatmap />}
                    />
                    <Route
                        path="/prototype/:type"
                        element={<PrototypeLeaderboard />}
                    />
                    <Route
                        path="/prototype/leaderboard/:type"
                        element={<PrototypeLeaderboard />}
                    />
                    <Route
                        path="/prototype/profile/:uid/:type"
                        element={<PrototypePlayerProfile />}
                    />
                    <Route
                        path="/prototype/top-plays/:type"
                        element={<PrototypeTopPlays />}
                    />
                    <Route
                        path="/prototype/calculate"
                        element={<PrototypeCalculateBeatmap />}
                    />
                    <Route
                        path="/match_history/:matchid"
                        element={<MatchHistory />}
                    />
                    <Route path="/skin/list" element={<SkinList />} />
                    <Route
                        path="/skin/:discordid/:name"
                        element={<SkinPreview />}
                    />
                </Routes>
            </AnimatePresence>
            <hr />
            <Footer />
            <ScrollToTop />
        </>
    );
}

export default App;
