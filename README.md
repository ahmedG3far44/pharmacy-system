# Pharmacy cashier & inventory MVP

A React 19 + Express + PostgreSQL pharmacy operations system implementing the workflow in `docs/PRD.md`.

## Start locally

1. Copy `.env.example` to `.env` and point `DATABASE_URL` at PostgreSQL.
2. Run `npm install`.
3. Run `npm run db:migrate -- --name init` and `npm run db:seed`.
4. Run `npm run dev`.

Web: `http://localhost:5173` · API: `http://localhost:4000`

Seed logins:

- Admin: `+201000000001` / `Admin@123`
- Pharmacist: `+201000000002` / `Pharmacist@123`
- Cashier: `+201000000003` / `Cashier@123`

The API stores a short-lived JWT in an HTTP-only cookie. The JWT references a revocable database session; it is never written to browser storage.

