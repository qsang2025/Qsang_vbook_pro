load("config.js");

function execute(url) {
    url = normalizeUrl(url);
    var response = null;
    try {
        response = fetch(url);
    } catch (e) {
        return Response.error("Không thể kết nối đến truyện: " + e);
    }

    if (!response || !response.ok) {
        var status = response ? response.status : 0;
        return Response.error("Không thể tải danh sách chương (HTTP " + status + "): " + url);
    }

    var html = response.text();
    var bookId = "";

    var match = html.match(/\\?"bookId\\?":\s*\\?"([a-f0-9]{24})\\?"/);
    if (match) {
        bookId = match[1];
    }

    if (bookId) {
        var actionRes = null;
        try {
            actionRes = fetch(url, {
                method: "POST",
                headers: {
                    "Next-Action": CHAPTERS_ACTION_ID,
                    "Content-Type": "application/json",
                    "Accept": "text/x-component"
                },
                body: JSON.stringify([bookId])
            });
        } catch (err) {}

        if (actionRes && actionRes.ok) {
            var actionText = actionRes.text();
            var lines = actionText.split("\n");
            for (var k = 0; k < lines.length; k++) {
                if (lines[k].indexOf("1:[") === 0) {
                    try {
                        var chapters = JSON.parse(lines[k].substring(2));
                        if (chapters && chapters.length > 0) {
                            chapters.sort(function(a, b) {
                                return (a.number || 0) - (b.number || 0);
                            });

                            var list = [];
                            var cleanBaseUrl = url.replace(/\/+$/, "");

                            for (var i = 0; i < chapters.length; i++) {
                                var ch = chapters[i];
                                if (!ch || !ch.slugId) continue;
                                list.push({
                                    name: ch.label || ("Chương " + (ch.number || (i + 1))),
                                    url: cleanBaseUrl + "/" + ch.slugId,
                                    host: BASE_URL,
                                    lock: !!ch.isLock
                                });
                            }

                            if (list.length > 0) {
                                return Response.success(list);
                            }
                        }
                    } catch (pe) {}
                    break;
                }
            }
        }
    }

    // Fallback: parse direct chapter links from DOM
    var doc = response.html();
    var directLinks = doc.select("a[href*='/chuong-']");
    var fallbackList = [];
    var seen = {};

    for (var j = 0; j < directLinks.size(); j++) {
        var a = directLinks.get(j);
        var href = a.attr("href");
        if (href && !seen[href]) {
            seen[href] = true;
            fallbackList.push({
                name: dedupeTitle(a.text()) || ("Chương " + (fallbackList.length + 1)),
                url: normalizeUrl(href),
                host: BASE_URL,
                lock: false
            });
        }
    }

    if (fallbackList.length > 0) {
        return Response.success(fallbackList);
    }

    return Response.error("Không tìm thấy danh sách chương cho truyện này.");
}
