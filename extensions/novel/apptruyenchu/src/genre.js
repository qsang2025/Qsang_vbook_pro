load("config.js");

function execute() {
    return Response.success([
        { title: "Tiên hiệp", input: "/truyen?cate=tien-hiep", script: "gen.js" },
        { title: "Huyền huyễn", input: "/truyen?cate=huyen-huyen", script: "gen.js" },
        { title: "Huyền ảo", input: "/truyen?cate=huyen-ao", script: "gen.js" },
        { title: "Kiếm hiệp", input: "/truyen?cate=kiem-hiep", script: "gen.js" },
        { title: "Đô thị", input: "/truyen?cate=do-thi", script: "gen.js" },
        { title: "Khoa huyễn", input: "/truyen?cate=khoa-huyen", script: "gen.js" },
        { title: "Dị giới", input: "/truyen?cate=di-gioi", script: "gen.js" },
        { title: "Dị năng", input: "/truyen?cate=di-nang", script: "gen.js" },
        { title: "Trọng sinh", input: "/truyen?cate=trong-sinh", script: "gen.js" },
        { title: "Xuyên không", input: "/truyen?cate=xuyen-khong", script: "gen.js" },
        { title: "Hệ thống", input: "/truyen?cate=he-thong", script: "gen.js" },
        { title: "Mạt thế", input: "/truyen?cate=mat-the", script: "gen.js" },
        { title: "Võng du", input: "/truyen?cate=vong-du", script: "gen.js" },
        { title: "Cổ đại", input: "/truyen?cate=co-dai", script: "gen.js" },
        { title: "Trinh thám", input: "/truyen?cate=trinh-tham", script: "gen.js" },
        { title: "Hài hước", input: "/truyen?cate=hai-huoc", script: "gen.js" },
        { title: "Vô địch", input: "/truyen?cate=vo-dich", script: "gen.js" },
        { title: "Phản phái", input: "/truyen?cate=phan-phai", script: "gen.js" },
        { title: "Tu chân", input: "/truyen?cate=tu-chan", script: "gen.js" },
        { title: "Truyện hoàn thành", input: "/truyen?status=COMPLETED", script: "gen.js" }
    ]);
}
