# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

---

### Local Dev Workflow

**Backend-first order:**
- Before running Pixel (storefront) tasks that hit the API → start backend first
- Backend: `cd apps/backend && pnpm run start` (or `dev`)
- Storefront needs: `NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000`

---

### External Services

| Service | Type | Address | Config Location |
|---------|------|---------|----------------|
| Database | PostgreSQL | 192.168.0.137:5432 | apps/backend/.env, apps/cms/.env |
| Redis | Cache | 192.168.0.45:6379 | apps/backend/.env |
| Meilisearch | Search | 192.168.0.45:7700 | apps/backend/.env, apps/storefront-v3/.env |
| CMS | Strapi | 192.168.0.45:1337 | apps/storefront-v3/.env |
| Backend | Medusa | localhost:9000 | apps/storefront-v3/.env |
| Storefront | Next.js | localhost:3001 | - |
| S3 | Cloud Storage | AWS (AKIAR2PQ3R2BJ2AYXNLR) | apps/cms/.env |
