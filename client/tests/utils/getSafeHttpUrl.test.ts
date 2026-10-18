import { getSafeHttpUrl } from "../../src/utils/getSafeHttpUrl";

describe("getSafeHttpUrl", () => {
    it.each(["http://example.com/a.osk", "https://example.com/a.osk?x=1"])("accepts %s", (url) => {
        expect(getSafeHttpUrl(url)).toBe(url);
    });

    it.each([
        "javascript:alert(1)",
        "JaVaScRiPt:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "/relative/path.osk",
        "//example.com/a.osk",
        "not a url",
        "",
    ])("rejects %j", (url) => {
        expect(getSafeHttpUrl(url)).toBeUndefined();
    });
});
