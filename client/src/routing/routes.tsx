import { Navigate, Route, Routes, useLocation } from "react-router";
import { AdminLayout } from "../admin/AdminLayout";
import { AdminVariantPage } from "../admin/AdminVariantPage";
import { AllVariantsPage } from "../admin/AllVariantsPage";
import { KeysPage } from "../admin/KeysPage";
import { RolesPage } from "../admin/RolesPage";
import { SnapshotPage } from "../calculator/SnapshotPage";
import { BeatmapCalculatorPage } from "../pages/BeatmapCalculatorPage";
import { AboutPage } from "../pages/AboutPage";
import { LoginPage } from "../pages/LoginPage";
import { MatchHistoryPage } from "../pages/MatchHistoryPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { ScoreMultiplierPage } from "../pages/ScoreMultiplierPage";
import { SkinListPage } from "../pages/SkinListPage";
import { SkinPreviewPage } from "../pages/SkinPreviewPage";
import { WhitelistPage } from "../pages/WhitelistPage";
import { ProfilePage } from "../profile/ProfilePage";
import { AppLayout } from "../shell/AppLayout";
import { VariantPage } from "../variant/VariantPage";
import { mapLegacyPath } from "./legacyRedirects";
import { defaultVariant, getVariantPath } from "./paths";

/** Sends an address of the old site to its new one, and shows not found for any other. */
function LegacyRedirect() {
    const { pathname, search, hash } = useLocation();
    const target = mapLegacyPath(pathname);

    return target === null ? <NotFoundPage /> : <Navigate replace to={target + search + hash} />;
}

/** Every page of the site, each in the shell. */
export function AppRoutes() {
    return (
        <Routes>
            <Route element={<AppLayout />}>
                <Route index element={<Navigate replace to={getVariantPath(defaultVariant)} />} />
                <Route path="v/:variant/players/:uid" element={<ProfilePage />} />
                <Route
                    path="v/:variant/calculator/s/:id"
                    element={<SnapshotPage scope="variant" />}
                />
                <Route path="calculate" element={<BeatmapCalculatorPage />} />
                <Route path="calculate/s/:id" element={<SnapshotPage scope="tool" />} />
                <Route path="whitelist" element={<WhitelistPage />} />
                <Route path="score-multiplier" element={<ScoreMultiplierPage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="login" element={<LoginPage />} />
                <Route path="skin/list" element={<SkinListPage />} />
                <Route path="skin/:discordid/:name" element={<SkinPreviewPage />} />
                <Route path="match_history/:matchid" element={<MatchHistoryPage />} />
                <Route path="admin" element={<AdminLayout />}>
                    <Route index element={<Navigate replace to="keys" />} />
                    <Route path="keys" element={<KeysPage />} />
                    <Route path="roles" element={<RolesPage />} />
                    <Route path="variants" element={<AllVariantsPage />} />
                    <Route path="variants/:name" element={<AdminVariantPage />} />
                </Route>
                <Route path="v/:variant/:tab" element={<VariantPage />} />
                <Route path="*" element={<LegacyRedirect />} />
            </Route>
        </Routes>
    );
}
