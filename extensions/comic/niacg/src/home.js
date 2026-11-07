function execute() {
    return Response.success([
        { title: "韩漫", input: "/listinfo-15-0.html", script: "search.js" },
        { title: "日漫", input: "/listinfo-14-0.html", script: "search.js" },
        { title: "本子", input: "/listinfo-3-0.html", script: "search.js" },
        { title: "A漫", input: "/listinfo-9-0.html", script: "search.js" },
        { title: "CG", input: "/listinfo-2-0.html", script: "search.js" }
    ]);
}
