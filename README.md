This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Storage cleanup + RLS troubleshooting

### Apply migrations
Run the new phase-1 migration in your Supabase project:

```bash
supabase db push
```

Or run the SQL directly from `supabase/migrations/202602160001_phase1_security_and_storage.sql` in Supabase SQL Editor.

### Required environment variables
Make sure these are set locally and in deployment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (required by secure server routes like listing deletion + Stripe webhooks)
- `NEXT_PUBLIC_SITE_URL` (used for Stripe checkout success/cancel redirect URLs)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PREMIUM_MONTHLY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (optional; only required for client-side Stripe.js usage)

### Troubleshooting checklist
- If listing delete fails with `401`, confirm the user session token is present in client auth.
- If listing delete fails with `403`, verify listing `user_id` matches the authenticated user.
- If uploads fail, verify file type is one of `image/jpeg`, `image/png`, `image/webp` and each file is <= 5MB.
- If storage delete fails, verify the `listings` bucket exists and policies were applied from the migration.
- Listing image reads are intentionally public for marketplace browsing.
