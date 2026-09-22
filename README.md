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
