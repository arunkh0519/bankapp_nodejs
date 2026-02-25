# Project Notes

## Overview

- Backend: Node.js + Express with JWT auth and MySQL.
- Admin: login, create users, view users, view all transactions.
- User: login, add accounts, view accounts, view transactions, OTP-based fund transfer.
- UI: served directly by backend from `backend/public` so it runs without Vite.
- Optional React UI exists in `frontend/` but is not required to run.

## Runtime Flow

- Admin login -> `POST /api/auth/admin/login` -> JWT issued
- Create user -> `POST /api/admin/users`
- User login -> `POST /api/auth/user/login` -> JWT issued
- Add account -> `POST /api/user/accounts`
- Transfer initiate -> `POST /api/user/transfers/initiate`
  - validates from account ownership, to account existence, balance
  - creates OTP record and returns OTP for assessment
- Transfer verify -> `POST /api/user/transfers/verify`
  - validates OTP, updates balances, inserts transaction

## Data Model

- users
  - id, name, mobile, password_hash, role, created_at
- accounts
  - id, user_id, account_no, bank_name, balance, created_at
- transfer_otps
  - id, from_account_id, to_account_id, amount, otp, status, expires_at, created_at
- transactions
  - id, from_account_id, to_account_id, amount, status, reference, created_at

## Files and why they exist

- `backend/src/index.js`: Server entry point, API routes, static UI hosting.
- `backend/src/db.js`: MySQL connection pool and environment loading.
- `backend/src/middlewares/auth.js`: JWT auth guard and role checks.
- `backend/src/routes/auth.js`: Auth endpoints wiring.
- `backend/src/routes/admin.js`: Admin endpoints wiring.
- `backend/src/routes/user.js`: User endpoints wiring.
- `backend/src/controllers/authController.js`: Login handlers.
- `backend/src/controllers/adminController.js`: Admin handlers for users and transactions.
- `backend/src/controllers/userController.js`: User handlers for accounts and transfers.
- `backend/src/services/authService.js`: Auth logic and token issuing.
- `backend/src/services/adminService.js`: Admin data operations.
- `backend/src/services/userService.js`: Account, transfer, OTP, and transaction logic.
- `backend/db/schema.sql`: Database tables and relationships.
- `backend/scripts/create-admin.js`: CLI helper to create the first admin.
- `backend/public/index.html`: UI shell.
- `backend/public/app.css`: Light theme styling.
- `backend/public/app.js`: UI logic, routing, and API calls.
- `frontend/src`: Optional React UI source.
- `docker-compose.yml`: Local docker stack for MySQL and backend.
- `backend/Dockerfile`: Backend container build definition.

## Schema Status

- The schema is defined in `backend/db/schema.sql`.
- No changes are needed unless you want extra fields; update this file and re-run the schema.
