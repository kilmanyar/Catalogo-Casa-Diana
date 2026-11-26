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

## Funciones del panel y la tienda
- Tienda: WhatsApp por producto, ofertas/etiquetas, filtros de precio, cupones, cuentas de clientes (historial y repetir pedido), seguimiento en `/seguimiento`.
- Panel (`/admin`): pedidos, entregas con etapas y aviso por WhatsApp, clientes, stock (mínimos, mermas, código de barras, reservas por pedidos abiertos), ofertas, cupones, compras, gastos, reportes y usuarios.
- Cobro en persona con Tokefon (tarjeta/QR) o efectivo: se registra en el pedido (método "Tokefon") y se marca como pagado.

## Variables opcionales
- `RESEND_API_KEY`, `NOTIFY_EMAIL` (y `NOTIFY_FROM`): aviso por correo de cada pedido nuevo.
- Recuperar contraseña: `/recuperar` (por correo si hay `RESEND_API_KEY`; si no, el dueño genera un enlace en Admin → Usuarios y lo manda por WhatsApp).

## Estado del despliegue
Esta rama (`app-completa`) tiene el despliegue automático desactivado en `vercel.json`. Para publicarla: configurar Vercel (base de datos y variables), traer estos cambios a `main` y quitar el bloque `git` de `vercel.json`.
