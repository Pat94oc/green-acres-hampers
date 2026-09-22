# Supabase schema note

This app shares the existing `green-acres-dockets` Supabase project.

The live hamper schema has already been provisioned directly in that project using isolated `hamper_*` tables, views, functions, triggers and RLS policies.

Do **not** create or rename the existing docket tables (`customers`, `dockets`, `docket_products`, `products`, `source_uploads`) from this repository.

Any future migration committed here must only operate on objects prefixed `hamper_` (plus a hamper-specific private Storage bucket/policy when added).
