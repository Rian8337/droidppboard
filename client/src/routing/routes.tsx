import { Navigate, Route, Routes, useLocation } from "react-router";
import { SnapshotPage } from "../calculator/SnapshotPage";
import { BeatmapCalculatorPage } from "../pages/BeatmapCalculatorPage";
import { NotFoundPage } from "../pages/NotFoundPage";
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
                <Route path="v/:variant/:tab" element={<VariantPage />} />
                <Route path="*" element={<LegacyRedirect />} />
            </Route>
        </Routes>
    );
}
