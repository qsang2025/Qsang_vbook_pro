load("config.js");
load("cleanHtml.js");

function isJunkLine(line) {
    if (!line) return true;
    if (/^CHƯƠNG\s+\d+$/i.test(line)) return true;
    if (/^Chương trước$/i.test(line)) return true;
    if (/^Chương sau$/i.test(line)) return true;
    if (/^·\s*\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{4}/.test(line)) return true;
    if (/^\d{2}:\d{2}\s+\d{2}\/\d{2}\/\d{4}$/.test(line)) return true;
    if (/apptruyenchu\.pro/i.test(line) && line.length < 80) return true;
    if (/^Bạn đang đọc truyện trên/i.test(line)) return true;
    if (/^Báo lỗi chương$/i.test(line)) return true;
    if (/^Quảng cáo$/i.test(line)) return true;
    return false;
}

function filterContentLines(text) {
    var rawLines = text.split(/\r?\n|<br\s*\/?>/i);
    var cleanLines = [];
    for (var i = 0; i < rawLines.length; i++) {
        var line = rawLines[i].replace(/^[\s\u3000\u2000-\u200B\uFEFF]+|[\s\u3000\u2000-\u200B\uFEFF]+$/g, "");
        if (line && !isJunkLine(line)) {
            cleanLines.push(line);
        }
    }
    return cleanLines.join("<br><br>");
}

function extractChapterTitle(html, url) {
    var h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match) {
        var t = h1Match[1].replace(/<[^>]+>/g, "").trim();
        if (t) return dedupeTitle(t);
    }
    var numMatch = url.match(/\/chuong-(\d+)/);
    if (numMatch) {
        return "Chương " + numMatch[1];
    }
    return "";
}

function execute(url) {
    url = normalizeUrl(url);
    var response = null;
    try {
        response = fetch(url);
    } catch (e) {
        return Response.error("Lỗi kết nối máy chủ: " + e);
    }

    if (!response || !response.ok) {
        var status = response ? response.status : 0;
        return Response.error("Không thể tải nội dung chương (HTTP " + status + "): " + url);
    }

    var html = response.text();
    var chapterTitle = extractChapterTitle(html, url);

    // 1. Trích xuất streaming RSC chunk (:T<hex>,) - tối ưu cho Next.js App Router
    var pushes = [];
    var pushRegex = /self\.__next_f\.push\(\[1,\s*"([\s\S]*?)"\]\)/g;
    var match;
    while ((match = pushRegex.exec(html)) !== null) {
        pushes.push(match[1]);
    }

    var fullRsc = pushes.join("");
    if (fullRsc) {
        var tMatch = fullRsc.match(/:T[0-9a-f]+,([\s\S]*?)(?:\\n[0-9a-f]+:|"\]\)|$)/);
        if (tMatch) {
            var rawText = tMatch[1]
                .replace(/\\n/g, "\n")
                .replace(/\\"/g, "\"")
                .replace(/\\\\/g, "\\");
            var filtered = filterContentLines(rawText);
            var cleaned = CleanHtml.clean(filtered);
            if (cleaned && cleaned.length > 30) {
                return Response.success(cleaned, chapterTitle);
            }
        }

        // 2. Trích xuất React paragraph children nếu có
        var pMatches = fullRsc.match(/"children":\s*"([^"]+)"/g);
        if (pMatches && pMatches.length >= 3) {
            var lines = [];
            for (var i = 0; i < pMatches.length; i++) {
                var cMatch = pMatches[i].match(/"children":\s*"([^"]+)"/);
                if (cMatch && cMatch[1] && cMatch[1].length > 15) {
                    var lineStr = cMatch[1].replace(/\\"/g, "\"");
                    if (!isJunkLine(lineStr)) {
                        lines.push(lineStr);
                    }
                }
            }
            if (lines.length > 0) {
                var pCleaned = CleanHtml.clean(lines.join("<br><br>"));
                if (pCleaned && pCleaned.length > 30) {
                    return Response.success(pCleaned, chapterTitle);
                }
            }
        }
    }

    // 3. Fallback: DOM container (article, .chapter-content, #content)
    var doc = response.html();
    var container = doc.select("article, .chapter-content, #chapter-content, .reader-page, main").first();
    if (container) {
        container.select("script, style, button, a, .breadcrumb, h1").remove();
        var domHtml = container.html();
        var domFiltered = filterContentLines(domHtml);
        var domCleaned = CleanHtml.clean(domFiltered);
        if (domCleaned && domCleaned.length > 30) {
            return Response.success(domCleaned, chapterTitle);
        }
    }

    return Response.error("Không tìm thấy nội dung chương (có thể là chương VIP hoặc đã bị khóa): " + url);
}
