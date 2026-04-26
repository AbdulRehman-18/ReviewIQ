# reviewIQ


This workspace is configured to deploy the frontend app at `artifacts/dashboard` on Vercel.

## Vercel Deployment

The repository includes a root `vercel.json` with:

- `installCommand`: `pnpm install --frozen-lockfile`
- `buildCommand`: `pnpm build`
- `outputDirectory`: `artifacts/dashboard/dist/public`
- SPA rewrite fallback to `index.html` for client-side routes (`/reviews`, `/visualize`, etc.)

### Required Vercel Project Settings

1. Import this repository into Vercel.
2. Keep **Root Directory** as repository root.
3. Vercel will read `vercel.json` automatically.

### Environment Variables (if using AI providers)

Set these in Vercel Project Settings -> Environment Variables:

- `VITE_OPENROUTER_API_KEY`
- `VITE_OPENROUTER_MODEL` (optional; default in app is `openai/gpt-4o-mini`)
- `VITE_GEMINI_API_KEY`

## Local Verification

```bash
pnpm install
pnpm build
```

The production build output is generated in `artifacts/dashboard/dist/public`.
