load('config.js');

function execute(url) {
    url = normalizeUrl(url);
    var response = fetch(url);
    if (!response.ok) {
        return Response.error("Không tải được nội dung chương (HTTP " + response.status + ")");
    }
    var doc = response.html();

    var images = [];
    var imgElements = doc.select("#album_photo_cover img, .album_photo_cover img, .show_zoom img, .img_zoom img, .comicpage img, #img_zoom img, .img_zoom_img img, .read-block img");

    for (var i = 0; i < imgElements.size(); i++) {
        var el = imgElements.get(i);
        var src = el.attr("data-src") || el.attr("data-original") || el.attr("src") || "";
        src = src.trim();

        if (!src || src.indexOf("imgloading.gif") !== -1 || src.indexOf("loading.gif") !== -1) {
            continue;
        }

        src = src.replace(/^(?:https?:\/\/[^\/]+)?\/web\/\d+[a-z0-9_]*\//i, "");
        src = normalizeUrl(src);
        if (!src) {
            continue;
        }

        images.push({
            url: src,
            link: src,
            headers: {
                "Referer": BASE_URL + "/"
            },
            referrerpolicy: "origin"
        });
    }

    return Response.success(images);
}
