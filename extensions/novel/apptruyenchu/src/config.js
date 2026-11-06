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

// Boc URL anh goc tu Next.js proxy /_next/image?url=<encoded>&w=..&q=..
function unwrapCover(src) {
    var s = String(src === undefined || src === null ? "" : src).trim();
    if (!s) return "";
    var m = s.match(/[?&]url=([^&]+)/);
    if (m) {
        try {
            return decodeURIComponent(m[1]);
        } catch (e) {
            return m[1];
        }
    }
    return normalizeUrl(s);
}

// Loai bo chuoi lap lai neu site render ca 2 ban desktop/mobile
function dedupeTitle(s) {
    var t = String(s === undefined || s === null ? "" : s).trim();
    if (t.length < 30) return t;
    var head = t.substring(0, 15);
    var idx = t.indexOf(head, 15);
    if (idx > 15) return t.substring(0, idx).trim();
    return t;
}
