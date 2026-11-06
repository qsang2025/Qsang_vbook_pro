load("config.js");

function execute() {
    return Response.success([
        { title: "Tiên hiệp", input: "/truyen?cate=tien-hiep", script: "search.js" },
        { title: "Huyền huyễn", input: "/truyen?cate=huyen-huyen", script: "search.js" },
        { title: "Huyền ảo", input: "/truyen?cate=huyen-ao", script: "search.js" },
        { title: "Kiếm hiệp", input: "/truyen?cate=kiem-hiep", script: "search.js" },
        { title: "Đô thị", input: "/truyen?cate=do-thi", script: "search.js" },
        { title: "Khoa huyễn", input: "/truyen?cate=khoa-huyen", script: "search.js" },
        { title: "Dị giới", input: "/truyen?cate=di-gioi", script: "search.js" },
        { title: "Dị năng", input: "/truyen?cate=di-nang", script: "search.js" },
        { title: "Trọng sinh", input: "/truyen?cate=trong-sinh", script: "search.js" },
        { title: "Xuyên không", input: "/truyen?cate=xuyen-khong", script: "search.js" },
        { title: "Hệ thống", input: "/truyen?cate=he-thong", script: "search.js" },
        { title: "Mạt thế", input: "/truyen?cate=mat-the", script: "search.js" },
        { title: "Võng du", input: "/truyen?cate=vong-du", script: "search.js" },
        { title: "Cổ đại", input: "/truyen?cate=co-dai", script: "search.js" },
        { title: "Trinh thám", input: "/truyen?cate=trinh-tham", script: "search.js" },
        { title: "Hài hước", input: "/truyen?cate=hai-huoc", script: "search.js" },
        { title: "Vô địch", input: "/truyen?cate=vo-dich", script: "search.js" },
        { title: "Phản phái", input: "/truyen?cate=phan-phai", script: "search.js" },
        { title: "Tu chân", input: "/truyen?cate=tu-chan", script: "search.js" },
        { title: "Truyện hoàn thành", input: "/truyen?status=COMPLETED", script: "search.js" }
    ]);
}
