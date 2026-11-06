/**
 * HTML cleaning & content sanitization helper for vBook novel/comic chapters.
 * Strips script tags, ads, watermarks, tracking elements, and cleans paragraph spacing.
 * Runtime: Rhino ES6 only.
 * Attribution: Qsang_vbook_pro framework.
 */

var CleanHtml = (function () {
    var commonAdPatterns = [
        /truy\s*cập\s*.*?\s*để\s*đọc\s*(truyện\s*)?bản\s*(chuẩn|đầy\s*đủ)/gi,
        /bạn\s*đang\s*đọc\s*truyện\s*(tại|trên)\s*.*?\s*(com|net|vn|org)/gi,
        /chúc\s*bạn\s*đọc\s*truyện\s*vui\s*vẻ/gi,
        /nguồn\s*:\s*.*?\s*(com|net|vn)/gi,
        /nhóm\s*dịch\s*:.*?/gi,
        /vui\s*lòng\s*không\s*reup/gi,
        /cập\s*nhật\s*nhanh\s*nhất\s*tại/gi,
        /请收藏本站.*?/gi,
        /最新网址.*?/gi,
        /本章未完.*?/gi
    ];

    /**
     * Cleans an HTML string or jsoup Element for chapter content.
     * @param {string|Element} htmlOrElement
     * @param {object} options
     * @returns {string}
     */
    function clean(htmlOrElement, options) {
        if (!htmlOrElement) return "";
        options = options || {};

        var html = "";
        if (typeof htmlOrElement === "string") {
            html = htmlOrElement;
        } else if (htmlOrElement && typeof htmlOrElement.html === "function") {
            // Jsoup Element
            // Clone or remove unwanted elements if jsoup
            try {
                var el = htmlOrElement;
                el.select("script, style, iframe, noscript, embed, object, form, svg, button, input, .ads, .ad, [id*='ad-'], [class*='ad-']").remove();
                html = el.html();
            } catch (e) {
                html = String(htmlOrElement);
            }
        } else {
            html = String(htmlOrElement);
        }

        // 1. Remove dangerous / non-content tags via regex fallback
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
        html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
        html = html.replace(/<!--[\s\S]*?-->/g, "");
        html = html.replace(/<\/?(html|head|body|meta|title|link)\b[^>]*>/gi, "");
        html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");

        // 2. Normalize paragraph and line breaks
        html = html.replace(/<\/(p|div|section|article|h[1-6])>/gi, "<br><br>");
        html = html.replace(/<(p|div|section|article|h[1-6])\b[^>]*>/gi, "");
        html = html.replace(/<br\s*[\/]?>\s*<br\s*[\/]?>\s*(?:<br\s*[\/]?>\s*)+/gi, "<br><br>");

        // 3. Remove unwanted inline tags unless images are allowed
        if (options.allowImages) {
            html = html.replace(/<(?!\/?(br|img)\b)[^>]+>/gi, "");
        } else {
            html = html.replace(/<(?!\/?br\b)[^>]+>/gi, "");
        }

        // 4. Strip known ad patterns if requested (default true)
        if (options.stripAds !== false) {
            for (var i = 0; i < commonAdPatterns.length; i++) {
                html = html.replace(commonAdPatterns[i], "");
            }
        }

        // 5. Decode common entities & trim
        html = html.replace(/&nbsp;/gi, " ");
        html = html.replace(/&amp;/gi, "&");
        html = html.replace(/&lt;/gi, "<");
        html = html.replace(/&gt;/gi, ">");
        html = html.replace(/&quot;/gi, "\"");
        html = html.replace(/&#39;/gi, "'");

        // 6. Clean up leading/trailing <br> tags and excess whitespace
        html = html.replace(/^(?:\s*<br\s*[\/]?>\s*)+/gi, "");
        html = html.replace(/(?:\s*<br\s*[\/]?>\s*)+$/gi, "");
        html = html.trim();

        return html;
    }

    return {
        clean: clean
    };
})();
