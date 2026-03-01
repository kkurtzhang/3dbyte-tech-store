# Project Reference

## URLs
- **Storefront V3:** http://localhost:3001
- **Backend API:** http://localhost:9000
- **Meilisearch:** http://192.168.0.45:7700
- **Strapi CMS:** http://192.168.0.45:1337

## Environment Files
- `3dbyte-tech-store/apps/storefront-v3/.env`
- `3dbyte-tech-store/.env.example`

## Frontend Stack
- Next.js 16 (App Router + Turbopack)
- shadcn/ui components
- Meilisearch (search)
- Medusa JS SDK (commerce)

## Common Commands
```bash
# Start frontend
cd 3dbyte-tech-store && pnpm --filter storefront-v3 dev

# Start backend (if deps are fixed)
cd 3dbyte-tech-store && pnpm --filter backend dev

# Install dependencies
cd 3dbyte-tech-store && pnpm install
```

## Known Issues
- Backend fails: Missing `@medusajs/payment` module
- Frontend runs in DEMO_MODE=True
