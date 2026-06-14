# النصر تك | Al-Nasr Tech ERP + E-Invoicing

نظام إدارة موارد المؤسسات والفوترة الإلكترونية المتوافق مع هيئة الضرائب المصرية.

## هيكل المشروع

```
alnasr-tech/
├── src/                    # Rust backend (Axum)
├── migrations/             # PostgreSQL database migrations
├── docker/                 # Backend Dockerfile
├── frontend/               # Next.js 16 frontend
│   ├── src/
│   │   ├── app/           # Pages (App Router)
│   │   ├── components/    # UI components
│   │   ├── lib/           # API client, auth store, utilities
│   │   └── hooks/         # Custom React hooks
│   ├── Dockerfile
│   └── package.json
├── rbf/                    # Rule-Based Framework (optional feature)
├── docker-compose.yml
└── .env.example
```

## التشغيل السريع باستخدام Docker

### 1. إعداد المتغيرات البيئية

```bash
cp .env.example .env
# عدّل ملف .env وأضف القيم المناسبة (خاصة JWT_SECRET)
```

### 2. تشغيل جميع الخدمات

```bash
docker compose up -d --build
```

هذا سيشغل:
- **PostgreSQL** على المنفذ `5432`
- **Backend (Rust)** على المنفذ `3001`
- **Frontend (Next.js)** على المنفذ `3000`

### 3. الوصول للتطبيق

افتح المتصفح على: `http://localhost:3000`

## التشغيل بدون Docker (للمطورين)

### Backend (Rust)

```bash
# تأكد من تشغيل PostgreSQL أولاً
export DATABASE_URL=postgres://alnasr:alnasr_secure_2024@localhost:5432/alnasr_tech
export JWT_SECRET=your_secret_key_at_least_32_chars!

# تشغيل الـ migrations
sqlx migrate run

# تشغيل الخادم
cargo run --release
```

الخادم يعمل على: `http://localhost:3000`

### Frontend (Next.js)

```bash
cd frontend

# تثبيت التبعيات
npm install

# تحديد عنوان الباك إند
export NEXT_PUBLIC_API_URL=http://localhost:3000

# تشغيل وضع التطوير
npm run dev
```

الفرونت إند يعمل على: `http://localhost:3000`

> **ملاحظة**: في وضع التطوير، يعمل Next.js كـ proxy للـ API requests، لذا لا توجد مشاكل CORS.

## الوظائف الرئيسية

| الوظيفة | الوصف |
|---------|-------|
| 📊 لوحة التحكم | إحصائيات شاملة للإيرادات والفواتير والعملاء |
| 👥 إدارة العملاء | CRUD كامل مع البحث والتصدير CSV |
| 🧾 إدارة الفواتير | إنشاء وتتبع فواتير مع ضريبة القيمة المضافة 14% |
| 💳 إدارة المدفوعات | تسجيل مدفوعات متعددة الطرق |
| 👤 إدارة المستخدمين | أدوار: مدير، محاسب، مستخدم، مشاهد |
| 🏢 إدارة المؤسسات | خطط: مجاني، مبتدئ، احترافي، مؤسسي |
| 🔍 سجل المراجعة | تتبع كل العمليات مع فلترة متقدمة |
| 📈 التحليلات | رسوم بيانية للإيرادات والاتجاهات |
| 📋 الفوترة الإلكترونية | تكامل مع هيئة الضرائب المصرية (ETA) |

## التقنيات المستخدمة

### Backend
- **Rust** + **Axum** - خادم API عالي الأداء
- **SQLx** + **PostgreSQL** - قاعدة بيانات موثوقة
- **JWT** - مصادقة آمنة مع refresh tokens
- **Argon2** - تشفير كلمات المرور

### Frontend
- **Next.js 16** + **React 19** - واجهة مستخدم حديثة
- **Tailwind CSS 4** + **shadcn/ui** - تصميم احترافي
- **React Query** - إدارة حالة الخادم
- **Zustand** - إدارة حالة العميل
- **Recharts** - رسوم بيانية تفاعلية

## متغيرات البيئة

| المتغير | مطلوب | الوصف |
|---------|-------|-------|
| `DATABASE_URL` | ✅ | رابط PostgreSQL |
| `JWT_SECRET` | ✅ | مفتاح التشفير (32 حرف على الأقل) |
| `POSTGRES_PASSWORD` | ✅ | كلمة مرور PostgreSQL |
| `ETA_CLIENT_ID` | ❌ | معرف عميل هيئة الضرائب |
| `ETA_CLIENT_SECRET` | ❌ | سر عميل هيئة الضرائب |
| `ALLOWED_ORIGINS` | ❌ | أصول CORS المسموحة |

## API Documentation

راجع [docs/API.md](docs/API.md) للتوثيق الكامل لجميع نقاط النهاية.

## الترخيص

هذا المشروع ملك لشركة النصر تك.
