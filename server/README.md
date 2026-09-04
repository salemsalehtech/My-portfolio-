# Portfolio API

This API uses Express and MongoDB through Mongoose.

## Local setup

1. Install and start MongoDB locally, or create a MongoDB Atlas database.
2. Copy `.env.example` to `.env`.
3. Set `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
4. Install dependencies and seed the database:

```powershell
npm.cmd install
npm.cmd run seed
npm.cmd run dev
```

The API runs at `http://localhost:4000`. The Vite client proxies `/api` requests to it.

## Admin dashboard

Open `http://localhost:5173/admin/login` and use the credentials configured in `.env`.