# 02 — Captura de mails con Mailpit en desarrollo local

| Campo | Valor |
| --- | --- |
| **Estado** | ⏳ Pendiente de decisión |
| **Fecha** | 2026-09-30 |
| **Relacionado** | `supabase/config.toml` · `.env` · `.env.test` · `tests/e2e/helpers/mailpit.ts` · `lib/services/auth.ts` · `app/auth/confirm/route.ts` |

## Contexto

La aplicación **no envía correos por sí misma**: toda la llegada de mail sale de Supabase Auth (GoTrue) — la confirmación de signup y `resetPasswordForEmail`, invocados desde `lib/services/auth.ts`. No existe en el repo una capa propia de envío que sea posible de reemplazar.

Mailpit **ya está instalado y operativo**, pero solo lo consume la suite E2E:

- `supabase/config.toml` → `[local_smtp] enabled = true`, puerto `54324` (clave renombrada desde `inbucket`; el contenedor sigue llamándose `supabase_inbucket_*`).
- `supabase/config.toml` → `[auth.email] enable_confirmations = true` (igual que producción) y `max_frequency = "1s"`.
- `.env.test` → `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `MAILPIT_URL=http://127.0.0.1:54324`.
- `tests/e2e/helpers/mailpit.ts` → cliente REST ya escrito: busca mails por destinatario (`/api/v1/search`), extrae el link `/auth/v1/verify` y espera por tipo (`signup` / `recovery`).
- `tests/e2e/global-setup.ts` → health check de Mailpit antes de cada corrida.

**El problema:** el `bun dev` de todos los días no pasa por Mailpit. `.env` apunta al proyecto **alojado** (`rhdzshwcbovvzgzjojfj.supabase.co`), así que los mails salen por el SMTP inbuilt de Supabase Cloud, chocan con el límite de **2 correos por hora** (no levantable sin SMTP custom) y Mailpit nunca los ve. Es la decisión pendiente: en modo desarrollo local, ¿cómo hacemos que los flujos de mail se prueben contra Mailpit?

## Opciones

### A. Desarrollo local contra el mismo stack que el E2E

Apuntar `.env.local` al Supabase local: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `DATABASE_URL` / `DIRECT_URL` a `127.0.0.1:54322`, `MAILPIT_URL=http://127.0.0.1:54324`. Mailpit captura todo automáticamente y el helper existente sirve igual a mano que a tests.

- ✅ Cero código nuevo: se reutiliza el stack, la config y el helper que ya funcionan para E2E.
- ✅ Flujos completos verificables a mano en la UI de Mailpit (confirmación de signup, reset de password).
- ✅ Los datos de prueba locales quedan separados de la nube por defecto.
- ❌ **Config a ajustar:** `site_url` y `additional_redirect_urls` en `supabase/config.toml` hoy solo aceptan `http://127.0.0.1:3100` (el puerto del E2E). Para `next dev` en el puerto 3000 hay que sumar `http://localhost:3000` y `http://localhost:3000/**`, o los links de confirmación no redirigen.
- ❌ Cambia la base de datos de trabajo: los datos reales de la nube no están disponibles; hay que alternar con cuidado entre `.env` y `.env.local`, y correr `bun run db:migrate:local`.
- ❌ Exige Docker corriendo en el día a día (el stack completo de `supabase start`, no solo Mailpit).
- ❌ **Límite a verificar:** `[auth.rate_limit] email_sent = 2` en la config local. Hay reportes (supabase/cli#4099) de que ese override **no aplica** mientras el proveedor inbuilt está activo — lo mismo que en la nube. Hay que probarlo empíricamente antes de prometer "sin límite en local".

### B. Mantener la nube + SMTP custom apuntando a Mailpit

Configurar `[auth.email.smtp]` en el proyecto alojado apuntando a tu instancia de Mailpit.

- ✅ Los datos de la nube siguen siendo los de trabajo.
- ❌ **No funciona directo:** el SMTP de Supabase Cloud no puede alcanzar tu `127.0.0.1`. Requiere un túnel público (ngrok / cloudflared), frágil y expuesto.
- ❌ Requiere credenciales SMTP custom en el proyecto alojado.

### C. Send Email Auth Hook en la nube → reenviar a Mailpit

Un hook en GoTrue que reciba el evento y lo reenvíe al Mailpit local.

- ✅ Disponible en plan Free; el rate limit de envío queda del lado del hook.
- ❌ El hook corre en la infraestructura de Supabase: **mismo problema de túnel público** que la opción B.
- ❌ Hay que reconstruir la URL de verificación a mano (`/auth/v1/verify?token=...&type=...&redirect_to=...`) y el naming de `token_hash` / `token_hash_new` está **invertido** respecto del mail al que pertenece (compatibilidad hacia atrás).
- ❌ El hook debe responder `200` con `{}`.

### D. Interceptar el `fetch` de `@supabase/supabase-js` en el cliente

La única seam que existe (no hay `EmailProvider`, `mailer` ni `sendEmail` en `@supabase/supabase-js` / `@supabase/auth-js`): `createClient(url, key, { global: { fetch } })`. En desarrollo, interceptar el `POST /recover`, adelantar el `code_challenge` a `/admin/generate_link`, inyectar el link en Mailpit (`POST /api/v1/send`) y devolver un 200 sintético.

- ✅ Mantendría toda la app apuntando a la nube.
- ❌ **Frágil:** el flujo PKCE exige conservar el `flowId` y el verifier en cookies; si se pierde, `exchangeCodeForSession` falla de forma determinística → `/reset-password?error=exchange_failed`.
- ❌ **No resuelve el límite de 2/hora en signup**: el `POST /signup` sigue llegando a la nube, que envía el correo igual.
- ❌ Sobra implementación por mantener por una utilidad que solo existe en desarrollo.

## Decisión

_Pendiente._ A resolver antes de tocar `.env` o `supabase/config.toml`.

## Consecuencias a evaluar

- **Si se elige A:**
  - Sumar `http://localhost:3000` y `http://localhost:3000/**` a `additional_redirect_urls` (y decidir qué hacer con `site_url`, hoy fijado en `127.0.0.1:3100` por el E2E).
  - Verificar empíricamente si `[auth.rate_limit] email_sent = 2` aplica con el proveedor inbuilt local; si aplica, documentar cómo subirlo.
  - Documentar en el `README.md` el flujo de alternancia `.env` (nube) ↔ `.env.local` (local) y el requisito de `bun run db:migrate:local`.
  - Confirmar que `supabase start` (el que ya usa `bun run e2e:up`) es el stack de uso diario, no solo de tests — evaluar si conviene un script `dev:local`.
- **Si se elige B o C:** resolver el túnel público, su costo operativo y su riesgo de exposición; son las opciones con peor relación beneficio/costo.
- **Si se elige D:** aceptar la deuda de mantener el interceptor PKCE y documentar que no cubre el rate limit de signup.
- **Cualquier opción:** no hay CI configurado, así que toda verificación es local. La decisión queda registrada acá y no en el código.
