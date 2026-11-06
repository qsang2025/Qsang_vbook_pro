function execute() {
    return Response.success([
        { title: "Mới cập nhật", input: "/truyen?sort=1", script: "gen.js" },
        { title: "BTV đề cử", input: "/truyen?sort=2", script: "gen.js" },
        { title: "Hoàn thành", input: "/truyen?status=COMPLETED", script: "gen.js" },
        { title: "Tất cả truyện", input: "/truyen", script: "gen.js" }
    ]);
}
