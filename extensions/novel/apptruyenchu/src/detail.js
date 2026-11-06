load("config.js");
load("config-helpers.js");
load("cleanHtml.js");

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
        return Response.error("Không thể mở chi tiết truyện (HTTP " + status + "): " + url);
    }

    var html = response.text();
    var doc = response.html();

    var name = "";
    var author = "";
    var cover = "";
    var description = "";
    var genres = [];
    var ongoing = true;

    // 1. Khai thác Schema JSON-LD (chuẩn SEO Next.js)
    var jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
        try {
            var parsed = JSON.parse(jsonLdMatch[1]);
            var items = Array.isArray(parsed) ? parsed : [parsed];
            for (var p = 0; p < items.length; p++) {
                var obj = items[p];
                if (obj && obj["@type"] === "Book") {
                    name = obj.name || name;
                    if (obj.author) {
                        author = obj.author.name || author;
                    }
                    if (obj.image) {
                        cover = unwrapCover(obj.image);
                    }
                    description = obj.description || description;
                    if (obj.genre) {
                        var gArr = Array.isArray(obj.genre) ? obj.genre : [obj.genre];
                        for (var g = 0; g < gArr.length; g++) {
                            genres.push({
                                title: gArr[g],
                                input: "/truyen",
                                script: "search.js"
                            });
                        }
                    }
                }
            }
        } catch (e) {}
    }

    // 2. Bổ sung từ DOM nếu JSON-LD thiếu hoặc cần làm phong phú
    if (!name) {
        var h1 = doc.select("h1").first();
        if (h1) name = dedupeTitle(h1.text());
    }

    if (!cover) {
        var img = doc.select("main img, img").first();
        if (img) cover = unwrapCover(img.attr("src"));
    }

    // Trạng thái truyện
    if (html.indexOf("Hoàn thành") !== -1) {
        ongoing = false;
    }

    // Lượt đọc & số chương từ DOM (nếu có)
    var viewsMatch = html.match(/([\d\.,]+)\s*lượt đọc/i);
    var views = viewsMatch ? viewsMatch[1] : "";
    var chapMatch = html.match(/([\d\.,]+)\s*chương/i);
    var totalChaps = chapMatch ? chapMatch[1] : "";

    var extraLines = [];
    if (totalChaps) extraLines.push("Số chương: " + totalChaps);
    if (views) extraLines.push("Lượt đọc: " + views);
    if (genres.length > 0) {
        var gList = [];
        for (var i = 0; i < genres.length; i++) {
            gList.push(genres[i].title);
        }
        extraLines.push("Thể loại: " + gList.join(", "));
    }

    var detail = ConfigHelpers.formatDetail(name, author, extraLines, "vi_VN");
    var cleanDesc = CleanHtml.clean(description);

    // Gợi ý truyện khác trên cùng trang
    var suggests = [];
    var seenSug = {};
    var sugLinks = doc.select("a[href^='/truyen/']");
    for (var s = 0; s < sugLinks.size(); s++) {
        var sa = sugLinks.get(s);
        var sHref = sa.attr("href");
        if (!sHref || sHref === "/truyen" || sHref.indexOf("/chuong-") !== -1) continue;
        var sUrl = normalizeUrl(sHref);
        if (sUrl === url || seenSug[sUrl]) continue;

        var sTitle = "";
        var sImg = sa.select("img").first();
        if (sImg) sTitle = sImg.attr("alt");
        if (!sTitle) {
            var sH3 = sa.select("h3").first();
            if (sH3) sTitle = sH3.text();
        }
        sTitle = dedupeTitle(sTitle);
        if (sTitle) {
            seenSug[sUrl] = true;
            suggests.push({
                title: sTitle,
                input: sUrl,
                script: "detail.js"
            });
            if (suggests.length >= 8) break;
        }
    }

    return Response.success({
        name: dedupeTitle(name),
        cover: cover,
        author: author,
        description: cleanDesc,
        detail: detail,
        ongoing: ongoing,
        genres: genres,
        suggests: suggests,
        host: BASE_URL
    });
}
