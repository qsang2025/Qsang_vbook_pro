load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var response = fetch(url);
    if (!response.ok) {
        return Response.error("Không tải được danh sách chương (HTTP " + response.status + ")");
    }
    var doc = response.html();

    var chapters = [];
    var seen = {};

    var dateSpans = doc.select(".episode .hidden-xs, .episode span[style*='float']");
    dateSpans.remove();

    var chElements = doc.select(".episode ul.btn-toolbar a, .episode a[href*='showinfo-17-']");
    for (var i = 0; i < chElements.size(); i++) {
        var el = chElements.get(i);
        var href = el.attr("href");
        if (!href) continue;
        href = href.replace(/^(?:https?:\/\/[^\/]+)?\/web\/\d+[a-z0-9_]*\//i, "");
        var normalizedHref = normalizeUrl(href);
        if (seen[normalizedHref]) continue;
        seen[normalizedHref] = true;

        var name = el.select("li, .current_series").text().trim() || el.text().trim();
        name = name.replace(/\s+/g, " ");
        if (name) {
            chapters.push({
                name: name,
                url: normalizedHref
            });
        }
    }

    if (chapters.length > 0) {
        chapters.reverse();
    } else {
        var readEl = doc.select("a.reading, a[href*='showinfo-17-']").first();
        if (readEl && readEl.attr("href")) {
            var rHref = readEl.attr("href").replace(/^(?:https?:\/\/[^\/]+)?\/web\/\d+[a-z0-9_]*\//i, "");
            chapters.push({
                name: "全一话",
                url: normalizeUrl(rHref)
            });
        } else {
            chapters.push({
                name: "全一话",
                url: url
            });
        }
    }

    return Response.success(chapters);
}
