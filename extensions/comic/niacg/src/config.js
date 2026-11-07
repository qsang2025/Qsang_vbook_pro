var BASE_URL = "https://www.niacg.com";
try {
    if (typeof DOMAIN !== "undefined" && DOMAIN) {
        BASE_URL = DOMAIN;
    }
} catch (e) {}

function normalizeUrl(url) {
    if (!url) return "";
    url = String(url).trim();
    if (!url) return "";
    if (url.indexOf("//") === 0) {
        url = "https:" + url;
    }
    if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) {
        var match = url.match(/^https?:\/\/[^\/]+/i);
        if (match) {
            var host = match[0].toLowerCase();
            if (/^https?:\/\/(?:www\.)?(?:niacg\.com|xpicvid\.com)$/i.test(host)) {
                return BASE_URL + url.slice(match[0].length);
            }
        }
        return url;
    }
    if (url.charAt(0) === "/") {
        return BASE_URL + url;
    }
    return BASE_URL + "/" + url;
}
