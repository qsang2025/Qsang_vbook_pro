load("config.js");

function execute(url, page) {
    page = String(page || "1");
    if (!url) url = "/truyen";

    var sep = url.indexOf("?") !== -1 ? "&" : "?";
    var targetUrl = normalizeUrl(url) + sep + "page=" + page;

    var response = null;
    try {
        response = fetch(targetUrl);
    } catch (e) {
        return Response.error("Lỗi kết nối máy chủ: " + e);
    }

    if (!response || !response.ok) {
        var status = response ? response.status : 0;
        return Response.error("Không thể kết nối máy chủ App Truyện Chữ (HTTP " + status + ")");
    }

    var doc = response.html();
    var cards = doc.select("a[href^='/truyen/']");
    var items = [];
    var seen = {};

    for (var i = 0; i < cards.size(); i++) {
        var a = cards.get(i);
        var href = a.attr("href");
        if (!href || href === "/truyen" || href.indexOf("/chuong-") !== -1) continue;

        var fullLink = normalizeUrl(href);
        if (seen[fullLink]) continue;

        var h3 = a.select("h3").first();
        var title = h3 ? h3.text() : "";
        var img = a.select("img").first();
        if (!title && img) {
            title = img.attr("alt") || "";
        }
        title = dedupeTitle(title);
        if (!title) continue;

        var cover = "";
        if (img) {
            cover = unwrapCover(img.attr("src") || img.attr("data-src") || "");
        }

        var pList = a.select("p");
        var author = pList.size() > 0 ? pList.get(0).text().trim() : "";
        var extra = pList.size() > 1 ? pList.get(1).text().trim() : "";
        var desc = author;
        if (extra) {
            desc = desc ? (desc + " • " + extra) : extra;
        }

        seen[fullLink] = true;
        items.push({
            name: title,
            link: fullLink,
            cover: cover,
            description: desc,
            host: BASE_URL
        });
    }

    var nextPage = "";
    var curPageNum = parseInt(page, 10);
    var nextTargetPage = curPageNum + 1;
    var hasNextInDom = doc.select("a[href*='page=" + nextTargetPage + "']").size() > 0;
    if (hasNextInDom || items.length >= 18) {
        nextPage = String(nextTargetPage);
    }

    return Response.success(items, nextPage);
}
