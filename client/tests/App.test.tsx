import { render, screen } from "@testing-library/react";
import { App } from "../src/App";

describe("App", () => {
    it("renders", () => {
        render(<App />);

        expect(screen.getByText("PP Board")).toBeInTheDocument();
    });
});
