# Chrome Web Store · Auto Fill Blog

## Tài nguyên đã chuẩn bị

- Gói tiện ích: `auto-fill-blog-1.3.4.zip` (tạo bằng `package.py`; `manifest.json` ở gốc ZIP).
- Icon: `icons/icon128.png` trong gói ZIP.
- Ảnh chụp giao diện: `screenshot-1280x800.png`.
- Ảnh giới thiệu nhỏ: `promo-440x280.png`.
- Trang chính sách công khai: `https://du0ngvanba0.github.io/auto-fill-blog-privacy/` (nguồn: `privacy.html` ở thư mục gốc).
- Bản quyền: `© Du0ngVanBa0` trong giao diện và `COPYRIGHT.txt` trong gói.

## Nội dung đề xuất cho Store Listing

**Tên:** Auto Fill Blog

**Ngôn ngữ:** Tiếng Việt

**Danh mục:** Productivity

**Mô tả ngắn:** Điền nhiều bài từ Sheets hoặc file nội dung local vào DramaStudio, kèm ảnh và Traffic ID. Xem lại trước khi tự lưu.

**Mô tả chi tiết:**

Auto Fill Blog giúp bạn đọc các hàng được chọn trong Google Sheets và điền vào biểu mẫu tạo bài viết tại DramaStudio. Bạn có thể chỉ định cột nội dung, cột tiêu đề, danh sách hàng như `2,4-6` và cột ảnh theo chương. Mỗi dòng trong ô ảnh là một đường dẫn local tương ứng với một chương. Nếu nội dung quá dài cho một ô Sheets, ghi `[FILE đường-dẫn-local]` ở đầu ô; tiện ích tự đọc toàn bộ file `.txt` hoặc `.md` tại đường dẫn riêng của từng hàng sau khi bạn bật quyền file URLs của Chrome. Với ảnh local, chọn thư mục chứa ảnh để tiện ích ghép đúng file cho từng chương. Bản xem trước cho phép kiểm tra nội dung và ảnh trước khi điền.

Mỗi hàng mở một tab bài viết riêng. Tiện ích chọn chế độ Chương, danh mục, đưa nội dung vào trình soạn thảo, phân tích chương và thêm Traffic ID sau tiêu đề bài viết cùng tên chương. Tiện ích không bấm nút Lưu; bạn kiểm tra kết quả và tự quyết định lưu.

Cần đăng nhập DramaStudio và bật quyền **Bất kỳ ai có đường liên kết đều có thể xem** cho bảng tính để tiện ích đọc dữ liệu qua CSV. Tiện ích chỉ hỗ trợ trang tạo bài viết tại `dramastudio.danhngon.pro`.

**Single purpose:** Đọc các hàng Google Sheets và file văn bản local được những hàng đó chỉ định, rồi điền vào biểu mẫu tạo bài viết DramaStudio để người dùng kiểm tra trước khi lưu.

## Quyền và dữ liệu để khai báo trong Privacy Practices

- `tabs`: mở một tab tạo bài viết cho mỗi hàng và đợi tab tải xong.
- `scripting`: điền biểu mẫu của trang DramaStudio sau khi người dùng bấm Điền.
- `docs.google.com`: đọc nội dung các hàng Google Sheets được người dùng chỉ định.
- `dramastudio.danhngon.pro`: điền biểu mẫu và tải ảnh riêng vào trình soạn thảo của từng chương.
- `file:///*`: đọc đúng file `.txt` hoặc `.md` theo marker `[FILE ...]` của các hàng đã chọn; người dùng phải bật **Allow access to file URLs** trong Chrome.
- Cấu hình được giữ trong `localStorage` của tiện ích. Nội dung hàng, file văn bản và file ảnh được xử lý trong phiên làm việc. Không có máy chủ của nhà phát triển, phân tích hành vi hay quảng cáo.
- Dữ liệu đến Google Sheets và DramaStudio theo thao tác người dùng; ảnh có thể được máy chủ DramaStudio nhận khi website xử lý upload.

Khai báo đúng các loại dữ liệu mà Dashboard hỏi, kể cả dữ liệu chỉ xử lý cục bộ. Dán URL chính sách HTTPS ở trên vào Dashboard và giữ nội dung khớp với các khai báo này.

## Cần bạn điền trước khi nộp

1. URL chính sách quyền riêng tư công khai: `https://du0ngvanba0.github.io/auto-fill-blog-privacy/`.
2. Email hỗ trợ trên Dashboard: điền địa chỉ bạn muốn công khai khi quyết định đăng Store.
3. Đăng nhập hoặc đăng ký tài khoản Chrome Web Store Developer.
4. Tải ZIP lên Dashboard, điền Listing và Privacy Practices, tải hai ảnh Store ở trên, chọn chế độ hiển thị rồi gửi xét duyệt.

Không đưa `test.js`, ảnh tham chiếu, script tạo tài nguyên hoặc nội dung Google Sheets thật vào ZIP. Dùng gói tạo bởi `package.py`.
