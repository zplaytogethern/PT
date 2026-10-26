# ZPlayN – Bảng giá

Trang bảng giá tĩnh (HTML + CSS, một ít JS để đọc dữ liệu), chạy được trên GitHub Pages.

## Cấu trúc

```
index.html        Trang bảng giá cho khách
admin.html        Trang admin sửa giá
css/style.css     Giao diện chung
css/admin.css     Giao diện trang admin
js/app.js         Đọc data/prices.json và hiển thị
js/admin.js       Sửa giá, xem thử, đẩy lên GitHub
data/prices.json  Toàn bộ giá (nguồn dữ liệu duy nhất)
```

## Đăng lên GitHub Pages

1. Tạo repo, tải toàn bộ thư mục lên.
2. Settings → Pages → Branch `main`, thư mục `/ (root)` → Save.
3. Trang khách: `https://<tài-khoản>.github.io/<repo>/`
   Trang admin: `https://<tài-khoản>.github.io/<repo>/admin.html`

## Cập nhật giá

Mở `admin.html`, sửa giá rồi chọn một trong hai cách:
- **Cập nhật lên web**: nhập tài khoản, repo, token GitHub; giá mới hiện sau khoảng 1 phút.
- **Tải prices.json**: thay file trong `data/` rồi commit.

Lưu ý: GitHub Pages không có máy chủ nên `admin.html` ai cũng mở được, nhưng chỉ người có token ghi vào repo mới đổi được giá thật.
Thêm mục mới (vd. danh mục khác) bằng cách sửa `data/prices.json`, trang web tự hiển thị.

## Cơ chế chống lưu cache & tự động cập nhật giá mới
- **Chống lưu session / cache cũ**: Tự động dọn dẹp bộ nhớ tạm, hủy Service Worker cũ (nếu có), sử dụng timestamp epoch minute + `cache: 'no-store'` + Header HTTP không lưu cache.
- **Bắt sự kiện Back/Forward Cache (`pageshow`)**: Khi khách dùng điện thoại mở lại app (Zalo, Safari, Chrome) hoặc bấm Back, web tự động kiểm tra giá mới nhất.
- **Tự động làm mới khi quay lại tab (`visibilitychange`)**: Khi chuyển qua app khác rồi quay lại sau 2 phút, web tự kiểm tra và cập nhật nếu có giá mới.
- **Polling ngầm & Nút làm mới thủ công**: Kiểm tra định kỳ mỗi 3 phút và có nút "🔄 Làm mới" trên giao diện để khách có thể chủ động cập nhật bất cứ lúc nào.
- **Cửa sổ xác nhận đặt hàng (Order Modal)**: Tự động sinh mẫu tin nhắn đặt hàng, hỗ trợ copy 1-click và nhắn thẳng Zalo/Instagram.
