load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var response = fetch(url);
    if (!response.ok) {
        return Response.error("Không tải được thông tin truyện (HTTP " + response.status + ")");
    }
    var doc = response.html();

    var titleEl = doc.select("h1.book-name, h1#book-name, h1").first();
    var name = titleEl ? titleEl.text().trim() : "";
    if (!name) return Response.error("Không tìm thấy thông tin truyện.");

    var coverEl = doc.select("img[itemprop='image'], .show_zoom img, .owl-item img, .ni_pepemei img").first();
    var cover = "";
    if (coverEl) {
        cover = coverEl.attr("data-src") || coverEl.attr("data-original") || coverEl.attr("src") || "";
        if (cover.indexOf("imgloading.gif") !== -1 || cover.indexOf("loading.gif") !== -1) {
            cover = coverEl.attr("data-src") || coverEl.attr("data-original") || "";
        }
    }
    cover = cover.replace(/^(?:https?:\/\/[^\/]+)?\/web\/\d+[a-z0-9_]*\//i, "");
    cover = normalizeUrl(cover);

    var authorEl = doc.select("span[itemprop='author'], span[data-type='author'], .title-truncate a").first();
    var author = authorEl ? authorEl.text().trim() : "";
    if (!author) author = "未知";

    var descEl = doc.select("#intro-block div.p-t-5.p-b-5, #intro-block div:matches(叙述|敘述|简介|簡介)").first();
    var description = "";
    if (descEl) {
        description = descEl.text().trim();
    } else {
        var intro = doc.select("#intro-block").first();
        if (intro) {
            description = intro.text().trim();
        }
    }
    description = description.replace(/^(?:敘述|叙述|简介|簡介)[:：]?\s*/, "").trim();

    var pageText = doc.text();
    var ongoing = true;
    var status = "";
    if (pageText.indexOf("完结") !== -1 || pageText.indexOf("完結") !== -1 || pageText.indexOf("最终话") !== -1 || pageText.indexOf("最終話") !== -1) {
        ongoing = false;
        status = "完结";
    } else if (pageText.indexOf("连载") !== -1 || pageText.indexOf("連載") !== -1) {
        ongoing = true;
        status = "连载";
    } else {
        ongoing = false;
    }

    var detail = "书名：" + name + "<br>作者：" + author + (status ? "<br>状态：" + status : "");

    var tags = [];
    var tagElements = doc.select(".tag-hot a, .tag-block a.btn, .tags a.tag");
    for (var i = 0; i < tagElements.size(); i++) {
        var tEl = tagElements.get(i);
        var tTitle = tEl.text().trim() || tEl.attr("title").trim();
        var tHref = tEl.attr("href").replace(/^(?:https?:\/\/[^\/]+)?\/web\/\d+[a-z0-9_]*\//i, "");
        if (tTitle && tTitle.indexOf("用户名") === -1 && tTitle.indexOf("密码") === -1) {
            tags.push({
                title: tTitle,
                input: tHref ? normalizeUrl(tHref) : "/tags-" + encodeURIComponent(tTitle) + "-0.html",
                script: "search.js"
            });
        }
    }

    return Response.success({
        name: name,
        cover: cover,
        author: author,
        description: description,
        detail: detail,
        ongoing: ongoing,
        host: BASE_URL,
        tags: tags,
        genres: tags
    });
}
