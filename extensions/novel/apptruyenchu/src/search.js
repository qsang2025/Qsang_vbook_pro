load("config.js");

function execute(query, page) {
    page = String(page || "1");
    var targetUrl = "";

    if (query && (query.indexOf("/") === 0 || query.indexOf("http://") === 0 || query.indexOf("https://") === 0)) {
        var sep = query.indexOf("?") !== -1 ? "&" : "?";
        targetUrl = normalizeUrl(query) + sep + "page=" + page;
    } else {
        targetUrl = BASE_URL + "/truyen?keyword=" + encodeURIComponent(query || "") + "&page=" + page;
    }

    var response = fetch(targetUrl);
    if (!response.ok) {
        return Response.error("Không thể kết nối máy chủ App Truyện Chữ: HTTP " + response.status);
    }

    var doc = response.html();
    var cards = doc.select("a.group.block[href^='/truyen/']");
    var items = [];

    for (var i = 0; i < cards.size(); i++) {
        var a = cards.get(i);
        var href = a.attr("href");
        if (!href || href === "/truyen") continue;

        var h3 = a.select("h3").first();
        var title = h3 ? h3.text().trim() : "";
        var img = a.select("img").first();
        var cover = "";

        if (img) {
            var rawSrc = img.attr("src") || img.attr("data-src") || "";
            var urlMatch = rawSrc.match(/url=([^&]+)/);
            if (urlMatch) {
                cover = decodeURIComponent(urlMatch[1]);
            } else if (rawSrc) {
                cover = normalizeUrl(rawSrc);
            }
        }

        var pList = a.select("p");
        var author = pList.size() > 0 ? pList.get(0).text().trim() : "";
        var extra = pList.size() > 1 ? pList.get(1).text().trim() : "";
        var desc = author;
        if (extra) {
            desc = desc ? (desc + " • " + extra) : extra;
        }

        items.push({
            name: title || "Truyện",
            link: normalizeUrl(href),
            cover: cover,
            description: desc,
            host: BASE_URL
        });
    }

    var nextPage = "";
    if (items.length >= 18) {
        var nextNum = parseInt(page, 10) + 1;
        nextPage = nextNum.toString();
    }

    return Response.success(items, nextPage);
}
