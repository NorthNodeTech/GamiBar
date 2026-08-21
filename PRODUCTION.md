# GamiBAR production runbook

The repository deploys as a static Vite/React frontend (`gamibar`) and a stateless Express API
(`gamibar-api`). Supabase owns durable database, Auth, Storage, and Realtime state. Do not persist
application data on Render's filesystem.

## 1. Render

Use the root [`render.yaml`](./render.yaml) as the only Blueprint. In Render Dashboard, connect this
repository and `main`, set the Blueprint path to `render.yaml`, and sync it. The service names must
remain `gamibar` and `gamibar-api` so the frontend API URL can be derived from the API service.
Review the sync preview before approving it: it must say it will update the two existing services.
If Render proposes suffixed duplicate services, cancel and attach the existing resources first.

Before deploying, set every `sync: false` variable in the service dashboard:

- API: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`,
  `NVIDIA_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_PLAN_MONTHLY_ID`,
  `RAZORPAY_PLAN_YEARLY_ID`, and `RAZORPAY_WEBHOOK_SECRET`.
- Frontend: `VITE_SUPABASE_ANON_KEY`. This must be the public anon/publishable key, never the
  service-role or secret key.

The Blueprint supplies the SPA rewrite, security headers, health check, CORS allowlist, Node 22,
timeouts, and build gates. Do not duplicate a second Blueprint under `backend/`.
Its CSP permits the current API host `https://gamibar-i2zr.onrender.com`; if that host ever changes,
update the CSP and webhook URL in the same release as `VITE_API_BASE_URL`.

After deployment verify:

```text
GET https://gamibar-i2zr.onrender.com/api/health
GET https://gamibar-i2zr.onrender.com/api/ready
GET https://gamibar.com/pricing
GET https://gamibar.com/terms
GET https://gamibar.com/play/test-room
```

The API endpoints must return JSON; the frontend routes must return `index.html` rather than 404.
Also verify an OPTIONS request from `https://gamibar.com` returns that exact
`Access-Control-Allow-Origin` value.

## 2. Supabase dashboard

In Authentication > URL Configuration, set the Site URL to `https://gamibar.com` and allow
`https://gamibar.com/**` plus the specific localhost callback used for development. Configure a
production SMTP sender before public launch. Password reset uses `/update-password`.

Realtime application channels are private and clients have read-only Broadcast authorization.
The API service role is the only broadcaster. Once this version is deployed everywhere, disable
public-channel access in Realtime Settings. Do not re-add the gameplay tables to the
`supabase_realtime` Postgres Changes publication.

The obsolete `author-google-signin` and `session-files` Edge Functions are tombstoned and require a
JWT. Delete them in the Supabase Dashboard after confirming no old client remains deployed.

## 3. Razorpay live mode

Test-mode keys and plan IDs cannot accept real payments. In Razorpay Live Mode, create:

- `GamiBAR Pro Monthly`: INR 49, every one month.
- `GamiBAR Pro Yearly`: INR 499, every one year.
- Lifetime: no subscription plan; the API creates a one-time INR 1,999 order.

Prices are exclusive of 18% GST. Put the two live plan IDs and live key pair in Render. Create a
webhook targeting:

```text
https://gamibar-i2zr.onrender.com/api/billing/webhook
```

Use a newly generated webhook secret and subscribe to payment, order, refund, and subscription
status events supported by the account. Enter the identical secret in Render. Run one low-value
live transaction and verify the signed webhook updates billing status before advertising plans.

## 4. Release and rollback

CI and Render must pass backend checks plus frontend lint, typecheck, and build. Apply matching
Supabase migrations before deploying code that depends on them. The one deliberate exception is
`20260820232400_quarantine_legacy_live_rooms_after_release.sql`: deploy the backend first, smoke-test create,
join, reconnect, and host refresh, then apply that migration because the currently deployed legacy
backend still reads the table. Keep the previous successful Render deploy available for rollback
and never retry payment-changing HTTP requests blindly.

Render and Supabase free tiers are suitable for development and early traffic, not a guaranteed
1,000-5,000 concurrent classroom load. Upgrade and load-test using [`backend/SCALING.md`](./backend/SCALING.md)
before promising that concurrency. Supabase database backups do not contain Storage objects, so
back up the database and Storage separately and test restoration.
