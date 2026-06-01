# Quản Lý Công Việc — Hướng dẫn chạy & deploy

App React (Vite) quản lý công việc theo sơ đồ tổ chức, có Dashboard, bảng dữ liệu, xuất Excel và đồng bộ Google Sheet.

---

## A. Chạy trên máy (local)

**Yêu cầu:** Cài [Node.js](https://nodejs.org) (bản LTS 18+).

1. Mở thư mục `quanly-app` trong Terminal / CMD.
2. Cài thư viện (chỉ làm 1 lần):
   ```bash
   npm install
   ```
3. Chạy thử:
   ```bash
   npm run dev
   ```
4. Mở trình duyệt vào địa chỉ hiện ra, thường là `http://localhost:5173`

Ở đây nút **Đồng bộ Sheet** sẽ chạy thật (không bị chặn như trong Claude).

---

## B. Deploy lên web miễn phí (Vercel — khuyên dùng)

### Cách 1: Kéo-thả nhanh nhất
1. Chạy `npm install` rồi `npm run build` → tạo ra thư mục `dist`.
2. Vào https://vercel.com → đăng nhập (bằng Google/GitHub).
3. Vào https://vercel.com/new → kéo-thả nguyên thư mục `dist` vào.
4. Xong — Vercel cho bạn 1 link `https://...vercel.app` chạy ngay.

### Cách 2: Qua GitHub (tự cập nhật khi sửa code)
1. Đẩy thư mục `quanly-app` lên 1 repo GitHub.
2. Vào https://vercel.com/new → chọn repo đó → bấm **Import**.
3. Vercel tự nhận Vite, cứ để mặc định:
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Bấm **Deploy**. Mỗi lần bạn push code mới, web tự cập nhật.

### Hoặc dùng Netlify (tương tự)
- Vào https://app.netlify.com/drop → kéo-thả thư mục `dist`. Xong.

---

## C. Đồng bộ Google Sheet

URL Apps Script đã được gắn sẵn trong `src/App.jsx` (biến `SHEET_URL` ở đầu file). Muốn đổi Sheet khác thì sửa dòng đó.

**Code Apps Script nên dùng** (dán vào Sheet → Extensions → Apps Script):

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  sheet.clearContents();
  sheet.appendRow(["Vị trí","Nhân sự","Email","SĐT","Công việc","Trạng thái","Deadline","Ghi chú"]);
  data.forEach(function(p){
    if(!p.tasks || p.tasks.length===0){
      sheet.appendRow([p.role,p.name,p.email,p.phone,"","","",""]);
    } else {
      p.tasks.forEach(function(t){
        sheet.appendRow([p.role,p.name,p.email,p.phone,t.title,t.status,t.deadline,t.note]);
      });
    }
  });
  return ContentService.createTextOutput(JSON.stringify({ok:true}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

**Quan trọng:** Sau khi sửa code Apps Script, phải:
Deploy → Manage deployments → ✏️ Edit → Version: **New version** → Deploy.
(Chỉ Save thôi thì thay đổi không có hiệu lực.)

> Lưu ý: app dùng `mode: "no-cors"` để gửi được sang Apps Script, nên app **không đọc được phản hồi** — nút luôn báo "Đã đồng bộ" kể cả khi Script lỗi. Hãy mở Sheet kiểm tra để chắc chắn dữ liệu đã vào.

---

## Cấu trúc thư mục
```
quanly-app/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx
    └── App.jsx   ← toàn bộ code app
```
