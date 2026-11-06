var BASE_URL = "https://apptruyenchu.pro";
try {
    if (typeof DOMAIN !== "undefined" && DOMAIN) {
        BASE_URL = DOMAIN;
    }
} catch (e) {}

var CHAPTERS_ACTION_ID = "40846d9ab28025db6a72550e98f102a4cdecf4a9a7";

function normalizeUrl(url) {
    if (!url) return "";
    url = url.trim();
    if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) {
        var match = url.match(/^https?:\/\/[^\/]+/i);
        if (match) return BASE_URL + url.slice(match[0].length);
        return url;
    }
    if (url.charAt(0) === "/") return BASE_URL + url;
    return BASE_URL + "/" + url;
}
