import ReactDOM from "react-dom";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { Providers } from "./contexts/Providers";

ReactDOM.render(
    <Providers>
        <HashRouter>
            <App />
        </HashRouter>
    </Providers>,
    document.getElementById("root")
);
