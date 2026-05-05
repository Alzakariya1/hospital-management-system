# Enterprise HMS — Vercel + Render + MongoDB Atlas Ready

This version is prepared for this real-world deployment flow:

```text
Frontend (Vercel)
        ↓ API calls
Backend (Render)
        ↓
Database (MongoDB Atlas)
```

No HMS module has been removed. Existing endpoints for auth, patients, doctors, appointments, beds, OPD/IPD, lab, radiology, pharmacy, billing, audit logs, security settings, health check, and PDF invoice export are kept and converted from MySQL/phpMyAdmin to MongoDB Atlas.

## Main production changes

- Backend database layer changed from MySQL/phpMyAdmin to MongoDB Atlas using Mongoose.
- All route files now use MongoDB models and keep numeric `id` fields for frontend/API compatibility.
- Render-ready backend config added.
- Vercel SPA routing config added.
- Secure CORS uses `FRONTEND_URL` from environment variables.
- Health check works at `/api/health`.
- Seed script creates admin, default departments, beds, medicine, and security settings.
- Frontend already uses `VITE_API_URL`, so it can call Render backend from Vercel.

## 1. MongoDB Atlas setup

1. Create a MongoDB Atlas project and cluster.
2. Create a database user.
3. Add network access. For testing, you can use `0.0.0.0/0`; for production, restrict it properly.
4. Copy your connection string.

Example:

```text
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/hms_db?retryWrites=true&w=majority
```

## 2. Backend local setup

```bash
cd backend
npm install
cp .env.example .env
npm run seed
npm run dev
```

On Windows PowerShell:

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm run seed
npm run dev
```

Update `backend/.env` before running seed:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_long_random_secret
FRONTEND_URL=http://localhost:5173
```

Backend URL:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

## 3. Frontend local setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Local frontend URL:

```text
http://localhost:5173
```

## 4. Login

After backend seed:

```text
Email: admin@hospital.com
Password: admin12345
```

Change this password after first login.

## 5. Deploy backend on Render

Render settings:

```text
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

Environment variables on Render:

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DB_NAME=hms_db
JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=8h
FRONTEND_URL=https://your-vercel-app.vercel.app
SEED_ADMIN_EMAIL=admin@hospital.com
SEED_ADMIN_PASSWORD=change_this_password
```

After first deploy, run Render Shell:

```bash
npm run seed
```

## 6. Deploy frontend on Vercel

Vercel settings:

```text
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

Environment variable on Vercel:

```env
VITE_API_URL=https://your-render-backend.onrender.com/api
```

After Vercel deploy, copy the Vercel domain and add it to Render backend `FRONTEND_URL`.

## 7. Important production checklist

1. Use a strong `JWT_SECRET`.
2. Change the seeded admin password.
3. Keep MongoDB Atlas backups enabled.
4. Restrict Atlas network access for production.
5. Keep `FRONTEND_URL` exact; do not use `*` for real hospital data.
6. Use HTTPS URLs only in production.
7. Configure real email/SMS services before using password reset with patients/staff.
8. Review healthcare privacy compliance before live patient-data use.

## 8. API base URLs

Local:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000/api
```

Production:

```text
Frontend: https://your-vercel-app.vercel.app
Backend:  https://your-render-backend.onrender.com/api
```
