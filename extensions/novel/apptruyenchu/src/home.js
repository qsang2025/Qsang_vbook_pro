load("config.js");

function execute() {
    return Response.success([
        { title: "Mới cập nhật", input: "/truyen", script: "search.js" },
        { title: "Truyện hoàn thành", input: "/truyen?status=COMPLETED", script: "search.js" },
        { title: "Tiên hiệp", input: "/truyen?cate=tien-hiep", script: "search.js" },
        { title: "Huyền huyễn", input: "/truyen?cate=huyen-huyen", script: "search.js" },
        { title: "Kiếm hiệp", input: "/truyen?cate=kiem-hiep", script: "search.js" },
        { title: "Đô thị", input: "/truyen?cate=do-thi", script: "search.js" }
    ]);
}
