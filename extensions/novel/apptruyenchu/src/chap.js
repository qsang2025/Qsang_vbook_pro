load("config.js");
load("cleanHtml.js");

function execute(url) {
    url = normalizeUrl(url);
    var response = fetch(url);
    if (!response.ok) {
        return Response.error("Không thể tải nội dung chương: HTTP " + response.status);
    }

    var html = response.text();

    // 1. Extract streamed RSC text chunk (Next.js App Router :T<hex>, format)
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
            var rawText = tMatch[1];
            var formatted = rawText.replace(/\\n/g, "<br><br>").replace(/\\"/g, "\"").replace(/\\\\/g, "\\");
            var cleaned = CleanHtml.clean(formatted);
            if (cleaned && cleaned.length > 30) {
                return Response.success(cleaned);
            }
        }

        // 2. Extract paragraph children if rendered as React array elements
        var pMatches = fullRsc.match(/"children":\s*"([^"]+)"/g);
        if (pMatches && pMatches.length >= 3) {
            var lines = [];
            for (var i = 0; i < pMatches.length; i++) {
                var cMatch = pMatches[i].match(/"children":\s*"([^"]+)"/);
                if (cMatch && cMatch[1] && cMatch[1].length > 15) {
                    lines.push(cMatch[1].replace(/\\"/g, "\""));
                }
            }
            if (lines.length > 0) {
                var pCleaned = CleanHtml.clean(lines.join("<br><br>"));
                if (pCleaned && pCleaned.length > 30) {
                    return Response.success(pCleaned);
                }
            }
        }
    }

    // 3. Fallback: jsoup DOM elements
    var doc = response.html();
    var container = doc.select(".reader-page, .chapter-content, #chapter-content, article, .content").first();
    if (container) {
        var domCleaned = CleanHtml.clean(container);
        if (domCleaned && domCleaned.length > 30) {
            return Response.success(domCleaned);
        }
    }

    return Response.error("Không tìm thấy nội dung chương (có thể là chương VIP hoặc đã bị khóa).");
}
