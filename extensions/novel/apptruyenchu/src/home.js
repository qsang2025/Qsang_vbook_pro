load("config.js");

function execute() {
    return Response.success([
        { title: "Mới cập nhật", input: "/truyen", script: "gen.js" },
        { title: "Hoàn thành", input: "/truyen?status=COMPLETED", script: "gen.js" },
        { title: "Tiên hiệp", input: "/truyen?cate=tien-hiep", script: "gen.js" },
        { title: "Huyền huyễn", input: "/truyen?cate=huyen-huyen", script: "gen.js" },
        { title: "Kiếm hiệp", input: "/truyen?cate=kiem-hiep", script: "gen.js" },
        { title: "Đô thị", input: "/truyen?cate=do-thi", script: "gen.js" }
    ]);
}
