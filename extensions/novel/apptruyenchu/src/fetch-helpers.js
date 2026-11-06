/**
 * Advanced Fetch Helper for vBook Extensions (Rhino ES6 Runtime).
 * Features:
 *  - Mirror Failover: seamlessly iterates over candidate mirrors on network/HTTP failures.
 *  - 429 Rate Limiting: respects 'Retry-After' header (seconds/date) with sleep() backoff.
 *  - Full POST & Custom Headers: supports Next.js Server Actions (Next-Action header + JSON body).
 *  - Charset support: UTF-8 and GBK decoding.
 * Runtime: Rhino ES6 only.
 * Attribution: Qsang_vbook_pro framework.
 */

var FetchPro = (function () {
    var defaultUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

    /**
     * Parse Retry-After header into milliseconds to wait.
     * @param {string} retryAfterStr
     * @param {number} fallbackMs
     * @returns {number}
     */
    function parseRetryAfter(retryAfterStr, fallbackMs) {
        if (!retryAfterStr) return fallbackMs || 2000;
        retryAfterStr = retryAfterStr.trim();

        // 1. Check if integer seconds
        if (/^\d+$/.test(retryAfterStr)) {
            var seconds = parseInt(retryAfterStr, 10);
            if (!isNaN(seconds) && seconds > 0) {
                return seconds * 1000;
            }
        }

        // 2. Check if HTTP date string
        try {
            var dateMs = Date.parse(retryAfterStr);
            if (!isNaN(dateMs)) {
                var diff = dateMs - (new Date()).getTime();
                if (diff > 0) return diff;
            }
        } catch (e) {
            // Ignore date parsing failure
        }

        return fallbackMs || 2000;
    }

    /**
     * Resolves the full URL given a path and candidate mirrors.
     * @param {string} urlOrPath
     * @param {string} mirror
     * @returns {string}
     */
    function buildTargetUrl(urlOrPath, mirror) {
        if (!urlOrPath) return mirror || "";
        urlOrPath = urlOrPath.trim();
        if (!mirror) return urlOrPath;

        mirror = mirror.replace(/\/+$/, "");

        // If urlOrPath is already absolute
        if (urlOrPath.indexOf("http://") === 0 || urlOrPath.indexOf("https://") === 0) {
            // If mirror is specified, replace the current domain with the mirror
            var match = urlOrPath.match(/^https?:\/\/[^\/]+/i);
            if (match) {
                return mirror + urlOrPath.slice(match[0].length);
            }
            return urlOrPath;
        }

        // Relative path
        if (urlOrPath.charAt(0) === "/") {
            return mirror + urlOrPath;
        }
        return mirror + "/" + urlOrPath;
    }

    /**
     * Core fetch executor with mirror failover, 429 retry, and custom method/headers/body.
     * @param {string} urlOrPath
     * @param {object} options
     * @returns {object} vBook response object
     */
    function request(urlOrPath, options) {
        options = options || {};
        var method = (options.method || "GET").toUpperCase();
        var mirrors = options.mirrors || [];
        var max429Retries = options.retries !== undefined ? options.retries : 2;
        var timeoutMs = options.timeout || 30000;
        var charset = options.charset || "utf-8";

        // If no mirrors provided, treat the urlOrPath itself as the single mirror target
        var candidates = mirrors.length > 0 ? mirrors.slice(0) : [""];

        var lastResponse = null;
        var lastError = "";

        // Iterate over candidate mirrors
        for (var m = 0; m < candidates.length; m++) {
            var currentMirror = candidates[m];
            var targetUrl = buildTargetUrl(urlOrPath, currentMirror);
            var attempt429 = 0;

            while (attempt429 <= max429Retries) {
                var fetchHeaders = {
                    "User-Agent": defaultUserAgent,
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
                };

                // Merge custom headers
                if (options.headers) {
                    for (var h in options.headers) {
                        if (options.headers.hasOwnProperty(h)) {
                            fetchHeaders[h] = options.headers[h];
                        }
                    }
                }

                // Prepare fetch params
                var fetchOptions = {
                    method: method,
                    headers: fetchHeaders,
                    timeout: timeoutMs
                };

                if (options.queries) {
                    fetchOptions.queries = options.queries;
                }

                if (method !== "GET" && method !== "HEAD" && options.body !== undefined) {
                    if (typeof options.body === "object" && fetchHeaders["Content-Type"] && fetchHeaders["Content-Type"].indexOf("application/json") !== -1) {
                        fetchOptions.body = JSON.stringify(options.body);
                    } else {
                        fetchOptions.body = options.body;
                    }
                }

                var response = fetch(targetUrl, fetchOptions);
                lastResponse = response;

                // Handle HTTP 429 Too Many Requests
                if (response.status === 429 && attempt429 < max429Retries) {
                    attempt429++;
                    var retryAfterHeader = response.header ? response.header("retry-after") : "";
                    var waitMs = parseRetryAfter(retryAfterHeader, 1500 * attempt429);
                    try {
                        sleep(waitMs);
                    } catch (e) {
                        // In case sleep is interrupted or unavailable
                    }
                    continue; // retry current mirror
                }

                // If response is OK (2xx), return immediately
                if (response.ok) {
                    return response;
                }

                // If status is a server error (5xx), gateway timeout (504), or connection blocked (403),
                // we break the 429 loop and failover to the next mirror
                if (response.status >= 500 || response.status === 504 || response.status === 403 || response.status === 0) {
                    lastError = "Mirror " + (currentMirror || targetUrl) + " failed with HTTP " + response.status;
                    break; // try next mirror
                }

                // For 4xx client errors (e.g. 404, 400), don't failover needlessly unless configured
                if (options.failoverOnAllErrors && m < candidates.length - 1) {
                    break; // try next mirror
                }

                // Return response as-is (e.g. 404)
                return response;
            }
        }

        // All mirrors exhausted
        return lastResponse;
    }

    /**
     * Next.js Server Action POST request helper.
     * Many modern Next.js sites query data through Server Actions with 'Next-Action' header.
     * @param {string} urlOrPath
     * @param {string} actionId The Next.js Action ID hash
     * @param {Array|object} payload Data passed to the server action
     * @param {object} options
     * @returns {object} response
     */
    function postNextAction(urlOrPath, actionId, payload, options) {
        options = options || {};
        var headers = options.headers || {};
        headers["Next-Action"] = actionId;
        headers["Content-Type"] = "application/json";
        headers["Accept"] = "text/x-component";

        options.method = "POST";
        options.headers = headers;
        options.body = JSON.stringify(payload || []);

        return request(urlOrPath, options);
    }

    /**
     * Standard JSON POST request.
     * @param {string} urlOrPath
     * @param {object} jsonBody
     * @param {object} options
     * @returns {object} response
     */
    function postJson(urlOrPath, jsonBody, options) {
        options = options || {};
        var headers = options.headers || {};
        if (!headers["Content-Type"]) {
            headers["Content-Type"] = "application/json";
        }
        if (!headers["Accept"]) {
            headers["Accept"] = "application/json, text/plain, */*";
        }
        options.method = "POST";
        options.headers = headers;
        options.body = JSON.stringify(jsonBody || {});

        return request(urlOrPath, options);
    }

    /**
     * Standard Form-URL-Encoded POST request.
     * @param {string} urlOrPath
     * @param {object} formData
     * @param {object} options
     * @returns {object} response
     */
    function postForm(urlOrPath, formData, options) {
        options = options || {};
        var headers = options.headers || {};
        if (!headers["Content-Type"]) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
        }
        options.method = "POST";
        options.headers = headers;
        options.body = formData || {};

        return request(urlOrPath, options);
    }

    /**
     * Convenience HTML GET fetch.
     * @param {string} urlOrPath
     * @param {object} options
     * @returns {HtmlElement|null}
     */
    function getHtml(urlOrPath, options) {
        var res = request(urlOrPath, options);
        if (!res || !res.ok) return null;
        var charset = (options && options.charset) || "utf-8";
        return charset.toLowerCase() === "gbk" ? res.html("gbk") : res.html();
    }

    /**
     * Convenience JSON GET fetch.
     * @param {string} urlOrPath
     * @param {object} options
     * @returns {object|null}
     */
    function getJson(urlOrPath, options) {
        var res = request(urlOrPath, options);
        if (!res || !res.ok) return null;
        return res.json();
    }

    return {
        request: request,
        postNextAction: postNextAction,
        postJson: postJson,
        postForm: postForm,
        getHtml: getHtml,
        getJson: getJson
    };
})();
