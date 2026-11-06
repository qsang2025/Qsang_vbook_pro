load("config.js");

function execute(url) {
    url = normalizeUrl(url);
    var response = fetch(url);
    if (!response.ok) {
        return Response.error("Không thể mở chi tiết truyện: HTTP " + response.status);
    }

    var html = response.text();
    var doc = response.html();

    var name = "";
    var author = "";
    var cover = "";
    var description = "";
    var genres = [];

    var jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
        try {
            var parsed = JSON.parse(jsonLdMatch[1]);
            var bookObj = Array.isArray(parsed) ? parsed[0] : parsed;
            name = bookObj.name || "";
            if (bookObj.author) author = bookObj.author.name || "";
            cover = bookObj.image || "";
            description = bookObj.description || "";

            if (bookObj.genre) {
                if (Array.isArray(bookObj.genre)) {
                    for (var g = 0; g < bookObj.genre.length; g++) {
                        genres.push({
                            title: bookObj.genre[g],
                            input: "/truyen",
                            script: "search.js"
                        });
                    }
                } else if (typeof bookObj.genre === "string") {
                    genres.push({ title: bookObj.genre, input: "/truyen", script: "search.js" });
                }
            }
        } catch (e) {}
    }

    if (!name) {
        var h1 = doc.select("h1").first();
        if (h1) name = h1.text().trim();
    }

    var extraLines = [];
    if (genres.length > 0) {
        var gList = [];
        for (var i = 0; i < genres.length; i++) {
            gList.push(genres[i].title);
        }
        extraLines.push("Thể loại: " + gList.join(", "));
    }

    var detail = ConfigHelpers.formatDetail(name, author, extraLines, "vi_VN");
    var cleanDesc = CleanHtml.clean(description);

    return Response.success({
        name: name,
        cover: cover,
        author: author,
        description: cleanDesc,
        detail: detail,
        genres: genres,
        host: BASE_URL
    });
}
