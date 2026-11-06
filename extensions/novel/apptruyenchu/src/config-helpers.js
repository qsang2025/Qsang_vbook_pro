/**
 * Configuration & Metadata helpers for vBook extensions.
 * Runtime: Rhino ES6 only (var, function, string concat +).
 * Attribution: Qsang_vbook_pro framework.
 */

var ConfigHelpers = (function () {
    /**
     * Safely reads an injected global config variable without ReferenceError.
     * In vBook, keys defined in plugin.json.config are injected into global scope.
     * @param {string} keyName
     * @param {string} defaultValue
     * @returns {string}
     */
    function getConfig(keyName, defaultValue) {
        try {
            var val = (new Function("return typeof " + keyName + " !== 'undefined' ? " + keyName + " : null;"))();
            if (val !== null && val !== undefined && val !== "") {
                return String(val);
            }
        } catch (e) {
            // Variable was not injected
        }
        return defaultValue !== undefined ? defaultValue : "";
    }

    /**
     * Normalizes an incoming URL by pointing its host to BASE_URL.
     * Handles old/mirror domains, www prefixes, and relative paths.
     * @param {string} url
     * @param {string} baseUrl
     * @returns {string}
     */
    function normalizeUrl(url, baseUrl) {
        if (!url) return "";
        url = url.trim();
        if (!baseUrl) return url;
        baseUrl = baseUrl.replace(/\/+$/, "");

        // Relative path
        if (url.indexOf("http://") !== 0 && url.indexOf("https://") !== 0) {
            if (url.charAt(0) === "/") {
                return baseUrl + url;
            }
            return baseUrl + "/" + url;
        }

        // Replace existing host with baseUrl host
        var match = url.match(/^https?:\/\/[^\/]+/i);
        if (match) {
            return baseUrl + url.slice(match[0].length);
        }
        return url;
    }

    /**
     * Formats the detail string strictly conforming to Rule 9 of vBook API Contract:
     * First line title, second line author, joined with <br>, in the extension's locale.
     * @param {string} title
     * @param {string} author
     * @param {Array<string>} extraLines
     * @param {string} locale e.g. "vi_VN", "zh_CN", "en_US"
     * @returns {string}
     */
    function formatDetail(title, author, extraLines, locale) {
        title = (title || "").trim();
        author = (author || "").trim();
        locale = (locale || "vi_VN").toLowerCase();

        var titleLabel = "Tên truyện: ";
        var authorLabel = "Tác giả: ";
        var unknownAuthor = "Không rõ";

        if (locale.indexOf("zh") === 0) {
            titleLabel = "书名：";
            authorLabel = "作者：";
            unknownAuthor = "未知";
        } else if (locale.indexOf("en") === 0) {
            titleLabel = "Title: ";
            authorLabel = "Author: ";
            unknownAuthor = "Unknown";
        }

        if (!author) author = unknownAuthor;

        var lines = [
            titleLabel + title,
            authorLabel + author
        ];

        if (extraLines && extraLines.length) {
            for (var i = 0; i < extraLines.length; i++) {
                if (extraLines[i] && extraLines[i].trim()) {
                    lines.push(extraLines[i].trim());
                }
            }
        }

        return lines.join("<br>");
    }

    /**
     * Converts pagination next-page token to string according to Rule 4.
     * Empty string "" means no more pages.
     * @param {any} next
     * @returns {string}
     */
    function formatNextPage(next) {
        if (next === null || next === undefined || next === false || next === 0 || next === "0") {
            return "";
        }
        return String(next);
    }

    return {
        getConfig: getConfig,
        normalizeUrl: normalizeUrl,
        formatDetail: formatDetail,
        formatNextPage: formatNextPage
    };
})();
