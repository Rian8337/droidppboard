import { BrowserRouter } from "react-router";
import { AppRoutes } from "./routing/routes";

export function App() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    );
}
