function execute() {
    var genres = [
        // 主要分类
        { title: "韩漫", input: "/listinfo-15-0.html", script: "search.js" },
        { title: "日漫", input: "/listinfo-14-0.html", script: "search.js" },
        { title: "本子", input: "/listinfo-3-0.html", script: "search.js" },
        { title: "最新A漫", input: "/listinfo-9-0.html", script: "search.js" },
        { title: "漫画总揽", input: "/listinfo-12-0.html", script: "search.js" },
        { title: "COS", input: "/listinfo-1-0.html", script: "search.js" },
        { title: "套图", input: "/listinfo-4-0.html", script: "search.js" },
        { title: "CG", input: "/listinfo-2-0.html", script: "search.js" },
        { title: "里番", input: "/listinfo-19-0.html", script: "search.js" },
        { title: "3D动漫", input: "/listinfo-20-0.html", script: "search.js" },

        // 热门标签
        { title: "巨乳", input: "/tags-巨乳-0.html", script: "search.js" },
        { title: "双马尾", input: "/tags-双马尾-0.html", script: "search.js" },
        { title: "黑丝", input: "/tags-黑丝-0.html", script: "search.js" },
        { title: "女仆", input: "/tags-女仆-0.html", script: "search.js" },
        { title: "纯爱", input: "/tags-纯爱-0.html", script: "search.js" },
        { title: "萝莉", input: "/tags-萝莉-0.html", script: "search.js" },
        { title: "调教", input: "/tags-调教-0.html", script: "search.js" },
        { title: "御姐", input: "/tags-御姐-0.html", script: "search.js" },
        { title: "全彩", input: "/tags-全彩-0.html", script: "search.js" },
        { title: "无修", input: "/tags-无修-0.html", script: "search.js" },
        { title: "连载", input: "/tags-连载-0.html", script: "search.js" },
        { title: "完结", input: "/tags-完结-0.html", script: "search.js" },
        { title: "原神", input: "/tags-原神-0.html", script: "search.js" },
        { title: "碧蓝航线", input: "/tags-碧蓝航线-0.html", script: "search.js" },
        { title: "崩坏", input: "/tags-崩坏-0.html", script: "search.js" }
    ];

    return Response.success(genres);
}
