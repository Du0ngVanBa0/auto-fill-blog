# Auto Fill Blog

Tiện ích Chrome điền các hàng trong Google Sheets vào trang tạo bài viết DramaStudio. Mỗi hàng mở một tab bài viết. Tiện ích **không bấm Lưu**: bạn xem lại tiêu đề, chương, nội dung và ảnh trước khi tự lưu trên website.

![Giao diện Auto Fill Blog với dữ liệu mẫu](store/screenshot-1280x800.png)

## Cài miễn phí từ GitHub

1. Mở [Releases của Auto Fill Blog](https://github.com/Du0ngVanBa0/auto-fill-blog/releases/latest) và tải file `auto-fill-blog-1.3.4.zip` trong **Assets**.
2. Giải nén ZIP vào một thư mục cố định trên máy. Thư mục bạn chọn phải chứa trực tiếp file `manifest.json` cùng `app.html`, `app.js` và thư mục `icons`. Đừng chọn thư mục cha bên ngoài.
3. Trong Chrome trên máy tính, mở `chrome://extensions`.
4. Bật **Developer mode** ở góc trên bên phải, bấm **Load unpacked**, rồi chọn thư mục vừa giải nén ở bước 2.
5. Nếu muốn, bấm biểu tượng mảnh ghép trên thanh công cụ và **Pin** Auto Fill Blog. Bấm icon tiện ích để mở trang cấu hình.

Đây là bản cài trực tiếp từ GitHub; chưa phát hành trên Chrome Web Store. Chrome có thể hiện nhắc nhở về tiện ích cài bằng Developer mode. Bạn cần giữ thư mục đã giải nén: di chuyển hoặc xóa thư mục sẽ làm tiện ích ngừng hoạt động.

### Cập nhật phiên bản

Tải ZIP mới trong Releases, giải nén đè vào **cùng thư mục** đã chọn khi cài. Sau đó mở `chrome://extensions`, bấm **Reload** trên card Auto Fill Blog và mở lại trang cấu hình. Cấu hình đã lưu trên máy thường được giữ khi bạn cập nhật tại cùng thư mục.

## Chuẩn bị Google Sheets và trang bài viết

- Đăng nhập [trang tạo bài viết DramaStudio](https://dramastudio.danhngon.pro/admin/posts/new) bằng Chrome trước khi điền.
- Trong Google Sheets, đặt quyền xem bảng tính là **Bất kỳ ai có đường liên kết đều có thể xem**. Tiện ích đọc dữ liệu qua CSV, không cần tài khoản Google hoặc API key trong tiện ích.
- Chuẩn bị cột chứa toàn bộ nội dung blog và cột chứa tiêu đề blog. Nếu muốn chèn ảnh vào các chương, chuẩn bị thêm một cột chứa danh sách đường dẫn ảnh local cho từng hàng.

## Cách dùng

1. Nhập **Google Sheets URL** và **Hàng** cần điền, ví dụ `2,4-6`. Có thể chọn tối đa 50 hàng trong một lần.
2. Mở **Cột, ảnh và trang đích**. Nhập đúng tên tab trong Sheets, chữ cột nội dung và chữ cột tiêu đề (ví dụ `D` và `F`). Các ô này để trống khi cài mới để không mang cấu hình của người khác. URL trang đích được điền sẵn vì tiện ích dành cho DramaStudio.
3. **Danh mục** mặc định là `Entertainment`; bạn có thể đổi. Nhập **Traffic ID** của lượt chạy hiện tại. Tiện ích thêm số này sau tiêu đề bài và từng tên chương.
4. Bấm **Đọc các hàng từ Sheets**. Mở từng hàng trong bản xem trước để kiểm tra tiêu đề, nội dung và ảnh của từng chương.
5. Bấm **Điền các bài viết**. Tiện ích mở một tab cho mỗi hàng, chọn chế độ **Chương**, chọn danh mục, điền nội dung, bật **Lưu tên chapter**, bấm **Phân tích chương**, rồi điền tiêu đề, Traffic ID và ảnh riêng vào từng chương.
6. Kiểm tra từng tab. Chỉ bấm **Lưu** trên DramaStudio khi bạn hài lòng với kết quả.

### Blog dài lưu trong file local

Nếu ô Sheets không chứa nổi nội dung, đặt marker `[FILE C:\sample\article.txt]` ở **đầu ô nội dung**, thay đường dẫn mẫu bằng đường dẫn thật đến file `.txt` hoặc `.md` trên máy của bạn. Mỗi hàng có thể trỏ tới một file khác nhau. Khi bấm **Đọc**, tiện ích tự lấy toàn bộ file thay cho phần văn bản xem trước còn lại trong ô; không cần nhập đường dẫn lần thứ hai. Giới hạn mỗi file là 10 MB.

Để dùng tính năng này, vào `chrome://extensions` → **Details** của Auto Fill Blog → bật **Allow access to file URLs** một lần, rồi quay lại bấm **Đọc các hàng từ Sheets**. Không cần bật quyền này nếu nội dung nằm hoàn toàn trong Sheets.

### Ảnh riêng cho từng chương

Nhập chữ **Cột ảnh theo chương** (ví dụ `G`). Trong ô ảnh của **mỗi hàng**, ghi mỗi đường dẫn trên một dòng, đúng thứ tự chương mà nút **Phân tích chương** tạo ra. Ví dụ ô `G36` cho hai chương:

```text
D:\images\tap-1.jpg
D:\images\tap-2.jpg
```

Bấm **Thư mục ảnh trên máy** và chọn thư mục chứa các ảnh đó. Bản xem trước kiểm tra từng đường dẫn trước khi điền. Khi tách chương, nếu số ảnh khác số chương, tiện ích báo lỗi và không gắn ảnh sai. Ảnh được tải vào trình soạn thảo **của chương tương ứng**, không dùng ô ảnh đại diện chung của bài viết. Ô ảnh trống thì bỏ qua ảnh. Giới hạn mỗi ảnh là 10 MB.

## Khi gặp lỗi

- **Không đọc được Sheets:** kiểm tra URL, tên tab, chữ cột và quyền xem bằng liên kết. Bảng tính cần cho phép truy cập CSV.
- **File local không đọc được:** kiểm tra đường dẫn trong marker, đuôi `.txt`/`.md` và quyền **Allow access to file URLs**.
- **Ảnh chưa khớp hoặc sai số chương:** chọn thư mục chứa đúng file ghi trong ô ảnh; mỗi dòng ứng với một chương, không dùng chung một ảnh cho nhiều chương.
- **Chrome đang khóa thanh tab:** thả tab đang kéo, chờ một chút rồi bấm Điền lại.
- **Trang DramaStudio đổi giao diện:** tiện ích dừng ở bước gặp lỗi. Các ô đã điền trước đó vẫn nằm trên tab để bạn kiểm tra.

## Dữ liệu và quyền truy cập

Tiện ích chỉ truy cập Google Sheets, các file local được hàng đã chọn chỉ định và `dramastudio.danhngon.pro`. Cấu hình bạn nhập được lưu trong bộ nhớ cục bộ của Chrome; nội dung bài và ảnh được xử lý trong phiên làm việc. Không có máy chủ của nhà phát triển hay chức năng tự đăng bài. Xem [chính sách quyền riêng tư](https://du0ngvanba0.github.io/auto-fill-blog-privacy/).

## Mã nguồn và kiểm thử

Thư mục gốc của repo là mã tiện ích; `store/package.py` tạo ZIP phát hành. `node test.js` chạy kiểm thử xử lý Sheets; `node test.js <đường-dẫn-module-playwright>` chạy thêm kiểm thử điền biểu mẫu. Bản quyền © Du0ngVanBa0.
