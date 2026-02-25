# Bank App

Fullstack bank application with Node.js, MySQL, JWT authentication, and a modern UI.

## Structure

- backend
- frontend

## Database setup

1. Create database
2. Run schema

```
mysql -u root -p -e "CREATE DATABASE bank_app"
mysql -u root -p bank_app < backend/db/schema.sql
```

## Backend and UI

1. Copy env
2. Install and run

```
cd backend
copy .env.example .env
npm install
npm run create-admin "Admin" "9999999999" "admin123"
npm run dev
```

Open http://localhost:4000 to use the UI.

## Frontend (optional)

```
cd frontend
copy .env.example .env
npm install
npm run dev
```

## Docker

```
docker compose up --build
```

Open http://localhost:4000.

## API overview

- POST /api/auth/admin/login
- POST /api/auth/user/login
- POST /api/admin/users
- GET /api/admin/users
- GET /api/admin/transactions
- POST /api/user/accounts
- GET /api/user/accounts
- GET /api/user/transactions
- POST /api/user/transfers/initiate
- POST /api/user/transfers/verify

