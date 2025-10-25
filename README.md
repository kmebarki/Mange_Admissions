# Admissions Suite (Monorepo)

A complete, multi‑tenant platform for **Candidature → Admission → Inscription → Facturation** with OpenAPI-first architecture.
Front-end strictly consumes the generated SDK (no direct fetch/axios).

## Packages & Apps
- `apps/backend`: Fastify + Prisma (PostgreSQL), OpenAPI, RBAC, workflows, audit, webhooks.
- `apps/web`: Next.js (App Router), React, Tailwind, shadcn/ui, Zustand; portals for **Candidate** and **Staff**.
- `packages/sdk`: SDK generated from `openapi/openapi.yaml` using `@hey-api/openapi-ts`.
- `openapi`: Source of truth for the API spec (OpenAPI 3.1).
- `prisma`: Database schema and migrations (with **RLS** for org_id).

## Quickstart
1. Copy `.env.example` to `.env` in **root** and **apps/backend**; set values.
2. Run PostgreSQL locally, e.g. via Docker:
   ```bash
   docker run --name admissions-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=admissions_suite -p 5432:5432 -d postgres:16
   ```
3. Install deps:
   ```bash
   pnpm install
   ```
4. Generate Prisma client & run migrations:
   ```bash
   pnpm prisma:migrate
   ```
5. Generate the SDK from OpenAPI:
   ```bash
   pnpm gen:sdk
   ```
6. Start backend then web (in two terminals):
   ```bash
   pnpm dev:backend
   pnpm --filter @adms/web dev
   ```

## Notes
- **RLS** is enabled with tenant isolation by `org_id`. Backend uses a required header `x-org-id` OR derives it from the authenticated user. Never bypass RLS in queries.
- Staff MFA, audit logs, and basic anti-fraud hooks are included as stubs to extend.
- This scaffold covers: catalogue/sessions, dynamic forms, DMS (documents), tests/evaluations, interviews, workflows/decisions, comms/templates, signature, billing/payments, reporting, integrations, and global tenant settings.


## Modules inclus (v2)
- DMS pré-signé (mock) – à brancher S3/GCS
- Workflows paramétrables (création états/transitions + guards exemples)
- Planification entretiens (créneaux & réservations)
- Paiements & échéanciers (plans + schedules) + webhook Stripe (stub)
- Intégration YPAREO (apprenant + external id)
