import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Footer from "./components/Footer";
import Head from "./components/Head";
import Header from "./components/Header";
import Menu from "./components/Menu";
import Home from "./pages/Home";
import Whitelist from "./pages/Whitelist";
import MainLeaderboard from "./pages/MainLeaderboard";
import MainCalculateBeatmap from "./pages/MainCalculateBeatmap";
import MainPlayerProfile from "./pages/MainPlayerProfile";
import MainTopPlays from "./pages/MainTopPlays";
import PrototypeLeaderboard from "./pages/PrototypeLeaderboard";
import PrototypePlayerProfile from "./pages/PrototypePlayerProfile";
import PrototypeTopPlays from "./pages/PrototypeTopPlays";
import PrototypeCalculateBeatmap from "./pages/PrototypeCalculateBeatmap";
import ScrollToTop from "./components/ScrollToTop";

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
                    <Route path="/leaderboard" element={<MainLeaderboard />} />
                    <Route
                        path="/profile/:uid"
                        element={<MainPlayerProfile />}
                    />
                    <Route path="/whitelist" element={<Whitelist />} />
                    <Route path="/top-plays" element={<MainTopPlays />} />
                    <Route
                        path="/calculate"
                        element={<MainCalculateBeatmap />}
                    />
                    <Route
                        path="/prototype"
                        element={<PrototypeLeaderboard />}
                    />
                    <Route
                        path="/prototype/leaderboard"
                        element={<PrototypeLeaderboard />}
                    />
                    <Route
                        path="/prototype/profile/:uid"
                        element={<PrototypePlayerProfile />}
                    />
                    <Route
                        path="/prototype/top-plays"
                        element={<PrototypeTopPlays />}
                    />
                    <Route
                        path="/prototype/calculate"
                        element={<PrototypeCalculateBeatmap />}
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
