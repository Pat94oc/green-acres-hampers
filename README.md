# Green Acres Hamper Operations — Stage 3

Internal hamper production, fulfilment and POD platform using the same architecture as Green Acres Dockets.

## Stack

- Next.js 16 / TypeScript
- Vercel
- Supabase Auth / Postgres / Storage / Edge Functions
- Shared Supabase project with Green Acres Dockets, isolated by `hamper_*` database objects

## Live backend

The live backend is the existing `green-acres-dockets` Supabase project. The hamper application uses isolated `hamper_*` tables, views and functions plus its own private `hamper-pods` Storage bucket. Existing docket records and Storage objects are not modified by the hamper app.

The `hamper-pod` Supabase Edge Function is deployed and active. It verifies the logged-in user, creates the private POD bucket if needed, uploads PDF/JPG/PNG POD files server-side, records them in `hamper_pods`, and generates short-lived signed links when a user opens a POD.

## Current workflow

- Login with the same Supabase staff account used by Green Acres Dockets
- Create an order once with customer, fulfilment method, delivery details, Priority, order taker and multiple hamper lines
- Production page aggregates hampers required for the selected/current period
- Production entries are additive audit-log entries rather than overwritten totals
- Orders move automatically Scheduled -> In Progress -> Production Complete
- User checks final packing and marks the order Ready
- Ready is grouped into Collection / Green Acres Delivery / DPD
- Order detail generates a printable delivery docket
- Collection and DPD complete directly from Ready
- Green Acres delivery moves Ready -> Delivered
- A delivered Green Acres order requires a signed POD; uploading the POD automatically moves it to Done
- Done shows whether a POD is stored
- POD files are private and opened through a five-minute signed URL

## POD rules

- Accepted: PDF, JPG, PNG
- Maximum size: 10 MB per file
- Stored privately in `hamper-pods`
- Database stores the Storage path and POD metadata
- The signed source document is not modified

## Environment variables

Create these in Vercel for Production, Preview and Development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://dznuusbynqpwurawjbga.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>
```

No service-role/secret key belongs in Vercel or the browser for this workflow. The Edge Function uses Supabase's server-side secret environment.

## Deployment

Use a separate GitHub repository and Vercel project named `green-acres-hampers`. It shares the Supabase backend but is a completely separate web app from Green Acres Dockets.

The Vercel site should not use Vercel Authentication. App login is Supabase Auth.

## Important database rule

Do not run the old Stage 1 standalone schema against the shared project. All live hamper database objects are already created in Supabase and prefixed `hamper_`.

## Next build items

1. Replace Hamper A/B/C placeholders with the real Christmas hamper list.
2. Test the complete workflow with genuine orders.
3. Add delivery-run planning after the core workflow is proven.
4. Later: batch scan multiple signed POD dockets and automatically attach them by printed hamper order number.

## Stage 4 operational update

Stage 4 adds:

- Production Schedule as the home page, grouped by production-ready date
- Weekly and daily required / made / remaining hamper totals
- Previous / current / next week navigation
- DPD packaging totals
- Faster partial production controls (+1, +5, Finish Line, custom quantity)
- Manual Start Production and Complete Production actions
- Production Log
- Signed Delivery Dockets bulk upload page
- Multi-page PDF splitting and per-page AI matching using the printed hamper order number
- Automatic POD filing and automatic movement to Done when a signed docket is confidently matched
- Needs Review queue for scans that cannot be matched safely

The bulk POD Edge Function is deployed in Supabase as `hamper-pod-batch` and its source is under `supabase/functions/hamper-pod-batch`.

`tsconfig.json` excludes `supabase/functions/**` because Supabase Edge Functions run on Deno and must not be type-checked by the Next.js/Vercel build.

## Stage 5 operational refinements

- Production can now be logged directly from the Production Schedule using +1, +5, Finish Line or a custom quantity.
- Weekly summary cards now show a hamper-by-hamper breakdown for Required, Made, Remaining and DPD Packaging.
- Signed delivery docket upload/review is merged into the Done page; the old /signed-dockets route redirects to Done.
- Delivery docket print CSS is tightened for a single A4 page with reduced header, table and signature spacing.

## Stage 6 refinements

- Orders now move automatically to **Ready** as soon as every hamper line is fully produced.
- Production Schedule calendar arithmetic is UTC-safe and anchored to the **Europe/Dublin** date, avoiding server/timezone drift.
- Schedule rows now show both **Ready By / Production Due** grouping and the actual delivery date for clarity.
- Collection dockets now include **Prepared By**, **Collected By**, **Signature**, and **Date / Time** lines.
- Printed dockets have been tightened further to maximise the chance of staying on one A4 page.
