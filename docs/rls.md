# Row-Level Security (RLS)

- Politique par tenant via `orgId` et la GUC Postgres `app.current_org`.
- Le backend définit `set_config('app.current_org', <orgId>)` à chaque requête (hook Fastify).

## Activation
```bash
pnpm --filter @adms/backend prisma migrate dev --name formbuilder
pnpm --filter @adms/backend rls
```
