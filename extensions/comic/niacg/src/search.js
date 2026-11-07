load('config.js');

function execute(query, page) {
    query = query ? String(query).trim() : "";
    page = page ? String(page).trim() : "1";
    var pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
        pageNum = 1;
    }
    var pageIndex = pageNum - 1;

    var response;
    var isFeed = (query.charAt(0) === "/" || query.indexOf("http://") === 0 || query.indexOf("https://") === 0);

    if (isFeed) {
        var targetUrl = query;
        if (/-\d+\.html(?:$|\?)/.test(targetUrl)) {
            targetUrl = targetUrl.replace(/-\d+\.html/, "-" + pageIndex + ".html");
        } else if (targetUrl.indexOf("?") !== -1) {
            targetUrl = targetUrl + "&page=" + page;
        } else {
            targetUrl = targetUrl + "?page=" + page;
        }
        response = fetch(normalizeUrl(targetUrl));
    } else {
        var searchUrl = BASE_URL + "/e/search/index.php";
        response = fetch(searchUrl, {
            method: "POST",
            body: {
                keyboard: query,
                show: "title,text,keyboard,ftitle",
                tempid: "1"
            }
        });
        if (!response.ok) {
            var tagUrl = BASE_URL + "/tags-" + encodeURIComponent(query) + "-" + pageIndex + ".html";
            response = fetch(tagUrl);
        }
    }

    if (!response.ok) {
        return Response.error("Không tải được danh sách truyện (HTTP " + response.status + ")");
    }

    var doc = response.html();
    var items = [];
    var elements = doc.select(".list-col");
    if (elements.isEmpty()) {
        elements = doc.select(".thumb-overlay-albums");
    }

    for (var i = 0; i < elements.size(); i++) {
        var el = elements.get(i);
        var titleEl = el.select(".video-title, a[title], img[title]").first();
        var name = titleEl ? (titleEl.text().trim() || titleEl.attr("title").trim()) : "";
        if (!name) continue;

        var linkEl = el.select("a[href*='showinfo-'], a[href*='moehome-'], a").first();
        var link = linkEl ? linkEl.attr("href") : "";
        if (!link) continue;
        link = link.replace(/^(?:https?:\/\/[^\/]+)?\/web\/\d+[a-z0-9_]*\//i, "");
        link = normalizeUrl(link);

        var imgEl = el.select("img.ni_pepezi, .ni_pepemei img, img").first();
        var cover = "";
        if (imgEl) {
            cover = imgEl.attr("data-src") || imgEl.attr("data-original") || imgEl.attr("src") || "";
            if (cover.indexOf("imgloading.gif") !== -1 || cover.indexOf("loading.gif") !== -1) {
                cover = imgEl.attr("data-src") || imgEl.attr("data-original") || "";
            }
        }
        cover = cover.replace(/^(?:https?:\/\/[^\/]+)?\/web\/\d+[a-z0-9_]*\//i, "");
        cover = normalizeUrl(cover);

        var author = el.select(".title-truncate:has(a) a, .title-truncate a").text().trim();
        var category = el.select(".label-sub, .label-category").text().trim();
        var desc = "";
        if (author) {
            desc = "作者: " + author;
        }
        if (category) {
            desc = (desc ? desc + " | " : "") + category;
        }
        if (!desc) {
            desc = el.select(".title-truncate").text().trim();
        }

        items.push({
            name: name,
            link: link,
            cover: cover,
            description: desc
        });
    }

    var hasNext = !doc.select(".pagination li.comic_a a, .pagination a:contains(下一页), .pagination a:contains(下一頁), .pagination a[href*='-" + pageNum + ".html']").isEmpty();
    var next = "";
    if (hasNext || items.length >= 20) {
        next = String(pageNum + 1);
    }

    return Response.success(items, next);
}
