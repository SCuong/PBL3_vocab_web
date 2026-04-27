# 📚 VocabLearning

Ứng dụng học từ vựng tiếng Anh — React + ASP.NET Core + SQL Server.

> **Nhánh `main`** — bản dành cho người dùng, chạy bằng Docker.  
> **Nhánh `Cuong`** — môi trường phát triển (dev).

---

## 🖥️ Yêu cầu

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows / macOS / Linux)
- Không cần Node.js, .NET hay SQL Server.

---

## 🚀 Cài đặt & Chạy

### Bước 1 — Tải về

```bash
git clone https://github.com/SCuong/PBL3_vocab_web.git
cd PBL3_vocab_web
```

> Hoặc tải ZIP: nhấn nút **Code → Download ZIP** trên GitHub, giải nén ra.

---

### Bước 2 — Tạo file cấu hình

**Windows:**
```bash
copy .env.example .env
```

**macOS / Linux:**
```bash
cp .env.example .env
```

Mở file `.env` và điền các thông tin sau:

```env
# Mật khẩu SQL Server (phải có chữ HOA + thường + số + ký tự đặc biệt, ≥8 ký tự)
SA_PASSWORD=VocabLearn@2024!

# Chuỗi bí mật JWT — đặt ngẫu nhiên
JWT_SECRET=change-this-to-a-very-long-random-secret-string

# Gmail dùng để gửi email quên mật khẩu
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
```

> **App Password Gmail** (nếu chưa có):  
> Vào [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) → tạo password cho app "VocabLearning" → Gmail trả về dãy 16 ký tự → dán vào `SMTP_PASSWORD`.

---

### Bước 3 — Chạy

```bash
docker compose up --build
```

⏳ Lần đầu mất khoảng **3–5 phút** (tải images, build code, khởi tạo database).

Khi thấy log:
```
vocablearning_db  | DB READY
```

Mở trình duyệt tại: **http://localhost:3000** ✅

---

## 🛑 Tắt ứng dụng

```bash
docker compose down
```

> Data vẫn được giữ nguyên, lần sau chạy lại bình thường.

---

## 🔄 Lần sau muốn chạy lại

```bash
docker compose up
```

---

## 📋 Các lệnh thường dùng

| Lệnh | Mô tả |
|------|-------|
| `docker compose up --build` | Lần đầu chạy |
| `docker compose up` | Các lần sau |
| `docker compose up -d` | Chạy nền (không chiếm terminal) |
| `docker compose down` | Tắt, giữ data |
| `docker compose down -v` | Tắt + xoá sạch data ⚠️ |
| `docker compose logs -f` | Xem log realtime |
| `docker compose logs -f backend` | Xem log backend |
| `docker compose pull && docker compose up --build` | Cập nhật phiên bản mới |

---

## ❓ Xử lý lỗi thường gặp

**Lỗi `SA_PASSWORD` không đủ mạnh**  
→ Mật khẩu phải có đủ: chữ HOA, chữ thường, số, ký tự đặc biệt (`@`, `!`, `#`...), tối thiểu 8 ký tự.  
→ Ví dụ hợp lệ: `MyPass@2024!`  
→ Sau khi đổi password, chạy `docker compose down -v` rồi `docker compose up --build`.

**Lỗi gửi email (SMTP)**  
→ Gmail cần bật **2-Step Verification** trước, sau đó tạo [App Password](https://myaccount.google.com/apppasswords).  
→ Dùng App Password 16 ký tự, không dùng mật khẩu Gmail thông thường.

**Port 3000 đã bị chiếm**  
→ Thêm dòng `FRONTEND_PORT=3001` vào file `.env` rồi chạy lại.  
→ Truy cập tại `http://localhost:3001`.

**Backend khởi động lại liên tục**  
→ SQL Server chưa sẵn sàng. Chờ thêm 1–2 phút.  
→ Kiểm tra: `docker compose logs db`

**Muốn reset toàn bộ về trạng thái ban đầu**  
```bash
docker compose down -v
docker compose up --build
```

---

## 🏗️ Kiến trúc

```
Trình duyệt → http://localhost:3000
                    │
                    ▼
          ┌─────────────────┐
          │  Nginx (port 80) │  frontend container
          │  React SPA       │
          │  /api/* → proxy  │
          └────────┬─────────┘
                   │ proxy /api/*
                   ▼
          ┌─────────────────┐
          │  ASP.NET Core   │  backend container
          │  (.NET 10)      │  (port 5152, nội bộ)
          └────────┬─────────┘
                   │ Entity Framework
                   ▼
          ┌─────────────────┐
          │  SQL Server     │  db container
          │  2022 Express   │  (port 1433, nội bộ)
          │  Database: PBL3 │
          └─────────────────┘
```

---

## 👨‍💻 Dành cho developer

Xem nhánh [`Cuong`](https://github.com/SCuong/PBL3_vocab_web/tree/Cuong) để phát triển với hot-reload.

---

*VocabLearning — PBL3 Project*
