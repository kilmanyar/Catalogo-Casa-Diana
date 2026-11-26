# Casa Diana — Catálogo + Panel de administración

Tienda/catálogo (TanStack Start + React + Tailwind) con panel en `/admin`:
pedidos, entregas/logística, clientes, stock (con alertas de mínimo), compras, gastos,
usuarios del panel, recibos imprimibles y respaldo completo a Excel.

## Variables de entorno (Vercel → Settings → Environment Variables)
- `DATABASE_URL` — Postgres (Vercel Storage → Neon).
- `BETTER_AUTH_SECRET` — cadena larga aleatoria.
- `BETTER_AUTH_URL` — dominio de producción, ej. `https://tu-dominio.vercel.app`.

## Build
`npm run build` (aplica migraciones en `migrations/` y compila). Output lo maneja Nitro (preset vercel).

## Primer uso
Entrar a `/login`, "Primera vez — crear cuenta" con `kilmanyar@gmail.com` (dueño). Luego agregar personal en `/admin/usuarios`.
