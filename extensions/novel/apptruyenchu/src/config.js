var BASE_URL = "https://apptruyenchu.pro";
try {
    if (typeof DOMAIN !== "undefined" && DOMAIN) {
        BASE_URL = DOMAIN;
    }
} catch (e) {}

load("config-helpers.js");
load("fetch-helpers.js");
load("cleanHtml.js");

var CHAPTERS_ACTION_ID = "40846d9ab28025db6a72550e98f102a4cdecf4a9a7";

function normalizeUrl(url) {
    return ConfigHelpers.normalizeUrl(url, BASE_URL);
}
