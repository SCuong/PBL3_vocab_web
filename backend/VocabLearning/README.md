# VocabLearning

Web app học từ vựng tiếng Anh xây bằng ASP.NET Core MVC và SQL Server.

## Tính năng chính

- Đăng ký, đăng nhập bằng tài khoản nội bộ.
- Hỗ trợ đăng nhập Google nếu cấu hình `ClientId` và `ClientSecret`.
- Admin CRUD cho:
  - Topic
  - Vocabulary
  - Example
  - User vocabulary
  - Progress
  - Exercise
  - Exercise result
  - Learning log
- Learning flow cho learner:
  - Học theo topic cha và topic con
  - Mỗi lần học 10 từ
  - Học xong batch sẽ làm minitest
  - Ghi nhận `user_vocabulary`, `progress`, `learning_log`

## Công nghệ sử dụng

- .NET 10
- ASP.NET Core MVC
- Entity Framework Core
- SQL Server
- Cookie Authentication
- Google Authentication (tùy chọn)

## Cấu trúc thư mục

- `Controllers/`: controller MVC
- `Models/`: entity model
- `Services/`: business logic
- `Data/`: `DbContext` và schema initializer
- `ViewModels/`: model cho view
- `Views/`: Razor views
- `wwwroot/`: css/js/static files

## Yêu cầu môi trường

- .NET SDK 10
- SQL Server
- Database tên `PBL3`

## Cài đặt và chạy

Nếu bạn làm việc trên repo tổng `pbl3_vocab_web`, có thể setup và chạy theo các bước sau.

### 1. Clone repository

```bash
git clone https://github.com/SCuong/pbl3_vocab_web.git
```

### 2. Mở solution

Mở file sau bằng Visual Studio:

```text
database/ImportVocabularyPBL3/ImportVocabularyPBL3.sln
```

### 3. Cấu hình SQL Server

Cập nhật `App.config` nếu SQL Server trên máy bạn không phải instance local mặc định.

Connection string mặc định:

```text
Server=.;Database=PBL3;Trusted_Connection=True;TrustServerCertificate=True;
```

Lưu ý:

- Nếu database `PBL3` đã tồn tại thì nên `drop` hoặc xóa database đó trước khi chạy tool import.

### 4. Kiểm tra file đầu vào

- Script khởi tạo database: `Scripts/PBL3.bootstrap.sql`
- File Excel nguồn: `Data/vocab.xlsx`

### 5. Build và chạy

- Chọn `Build Solution`
- Nhấn `F5` để chạy

### 6. Chạy web app VocabLearning

Sau khi import dữ liệu xong, chạy project web:

```powershell
dotnet restore
dotnet build
dotnet run
```

## Cấu hình

Connection string đang nằm trong `appsettings.json`:

```json
"ConnectionStrings": {
  "DefaultConnection": "Server=.;Database=PBL3;Trusted_Connection=True;TrustServerCertificate=True"
}
```

Nếu dùng Google login, điền thêm:

```json
"Authentication": {
  "Google": {
    "ClientId": "your-client-id",
    "ClientSecret": "your-client-secret"
  }
}
```

## Chạy project local

```powershell
dotnet restore
dotnet build
dotnet run
```

## Lưu ý về database

- Project hiện dùng `AppDbContext` cho dữ liệu chính.
- `CustomAuthSchemaInitializer` sẽ tự tạo hoặc cập nhật một số bảng auth cơ bản như `users` và `learning_log`.
- Các bảng nghiệp vụ còn lại cần tồn tại sẵn trong database `PBL3` theo schema của project.

