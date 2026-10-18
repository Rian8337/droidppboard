import { Navigate, Route, Routes, useLocation } from "react-router";
import { NotFoundPage } from "../pages/NotFoundPage";
import { VariantPagePlaceholder } from "../pages/VariantPagePlaceholder";
import { AppLayout } from "../shell/AppLayout";
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
                <Route path="v/:variant/:tab" element={<VariantPagePlaceholder />} />
                <Route path="*" element={<LegacyRedirect />} />
            </Route>
        </Routes>
    );
}
