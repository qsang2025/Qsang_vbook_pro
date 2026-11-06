load("config.js");

function execute(url) {
    url = normalizeUrl(url);
    var response = fetch(url);
    if (!response.ok) {
        return Response.error("Không thể tải danh sách chương: HTTP " + response.status);
    }

    var html = response.text();
    var bookId = "";

    var match = html.match(/\\?"bookId\\?":\s*\\?"([a-f0-9]{24})\\?"/);
    if (match) {
        bookId = match[1];
    }

    if (bookId) {
        var actionRes = fetch(url, {
            method: "POST",
            headers: {
                "Next-Action": CHAPTERS_ACTION_ID,
                "Content-Type": "application/json",
                "Accept": "text/x-component"
            },
            body: JSON.stringify([bookId])
        });

        if (actionRes.ok) {
            var actionText = actionRes.text();
            var jsonMatch = actionText.match(/1:(\[[\s\S]*\])/);
            if (jsonMatch) {
                try {
                    var chapters = JSON.parse(jsonMatch[1]);
                    var list = [];
                    var cleanBaseUrl = url.replace(/\/+$/, "");

                    for (var i = 0; i < chapters.length; i++) {
                        var ch = chapters[i];
                        list.push({
                            name: ch.label,
                            url: cleanBaseUrl + "/" + ch.slugId,
                            host: BASE_URL
                        });
                    }
                    if (list.length > 0) {
                        return Response.success(list);
                    }
                } catch (e) {}
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
                name: a.text().trim() || ("Chương " + (fallbackList.length + 1)),
                url: normalizeUrl(href),
                host: BASE_URL
            });
        }
    }

    if (fallbackList.length > 0) {
        return Response.success(fallbackList);
    }

    return Response.error("Không tìm thấy danh sách chương cho truyện này.");
}
