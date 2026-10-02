# Algo Solutions
Bilingual (Arabic/English) Next.js agency website with RTL, portfolio, service positioning, industry solutions and a multi-step project builder.

## Run
npm install
npm run dev

## Other future integrations
- Connect Supabase tables: leads, project_requests, project_requirements, project_files
- Add Resend notifications
- Add upload to Supabase Storage
- Add WhatsApp auto-message with Request ID
- Add client portal and proposals

## Sales system

- `/ar/start-project` and `/en/start-project` save validated requests through `POST /api/leads`.
- `/ar/sales` and `/en/sales` provide a protected CRM workspace: priority reasons, stages, due follow-ups, meeting briefs, scope points, follow-up drafts and won/lost reporting.
- Qualified scores are transparent brief-completeness rules, not AI forecasts. Drafts are deterministic and use submitted information; no enrichment or company research is implied.
- Drafts are not sent. Follow-ups are displayed when the dashboard opens or refreshes; no unattended email/Slack delivery or cron is configured.

### Activate

1. Apply `supabase/migrations/20261002171000_sales.sql` in a Supabase project dedicated to this site. Both tables use RLS and deny browser roles; only the server service role can read/write them.
2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and a cryptographically random `SALES_ADMIN_KEY` (at least 32 characters) as server-only Vercel environment variables. Use separate preview/production databases.
3. Deploy and visit `/ar/sales` with the access key. Sessions expire after eight hours.
4. Submit a test request, verify it appears once even if the same request is retried, update its stage, and record a won/lost outcome. Remove test data before operating.

No credentials or database connection are included in this repository. Unconfigured storage returns a clear failure instead of a false success. Public requests are limited to ten per trusted Vercel IP fingerprint per hour; only a one-way fingerprint is stored. Add platform bot protection for production abuse control. Client-generated request IDs make retries idempotent; optimistic version checks prevent overwriting concurrent edits.

Amounts are QAR. Won contract value is not cash collected. Recorded margin is contract value minus entered delivery cost only; it is not accounting net profit. Missing costs are shown explicitly. The dashboard covers the latest 5,000 leads and flags truncation. Times are stored as UTC; the overview shows Qatar time and the edit field uses the device timezone.

There are no imported customers, communications or fabricated sales. Existing leads can be migrated into the same table only after source mapping and access are supplied. LinkedIn/Apify, email, calendar, transcript analysis and Slack connectors are separate integrations requiring accounts and authorization.

## Verification

`npm run build`, `npx tsc --noEmit`, `npm test`, `npm run test:integration`.

Integration tests run the actual Next.js production server against a temporary PostgreSQL database with a local PostgREST adapter. They verify HTTP and persistence behavior, not browser interactions or the production Supabase connection.
