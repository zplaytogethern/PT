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
