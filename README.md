# SIDESHOT Beer Co. — live site source

This repository is the **source of truth** for [https://sideshot-beer.vercel.app](https://sideshot-beer.vercel.app).

`omgawdmadeit1/shotgun-beer-company` is the prior task tracker. It is **not** the live site.

## Stack

Static `index.html` on Vercel plus `POST /api/waitlist`. Production branch: `main`.

## Waitlist (SMI-145)

Homepage form posts to `/api/waitlist` (also `/api/sideshot/waitlist`). Signups require a valid email and 21+ confirmation. Success is only returned after a store accepts the write.

Production stores (at least one required on Vercel):

- `NOTION_TOKEN` → [SIDESHOT Waitlist](https://app.notion.com/p/2c3dc9f4c4454e3ebd1248d8aaed2818)
- `WAITLIST_NOTIFY_EMAIL` → founder inbox via FormSubmit, or Resend when `RESEND_API_KEY` is set

Local `.data/sideshot-waitlist.json` is **dev only**. Production without a store returns an error instead of a fake join.

```bash
npm test
npm run dev   # http://0.0.0.0:4173
```

## Connect this repo to the existing Vercel project

Do **not** import this as a new Vercel project. That mints a new `*.vercel.app` URL.

1. Open the Vercel project that already serves `sideshot-beer.vercel.app`.
2. **Settings → Git → Connect Git Repository**.
3. Select `omgawdmadeit1/sideshot-beer`.
4. Production branch = `main`.
5. Confirm the next production deploy still aliases to `https://sideshot-beer.vercel.app`.

After that, founder agents can ship by pushing (or opening a PR) on this repo. Vercel will build from Git.

## Agent seating

Seat SIDESHOT site work on **this** GitHub repo, not `gitlab.com/omgawd/lvlltd`.

## Homepage metrics (SMI-146)

Unverified numbers (3.8s / 99.8% / $0.65 / 70%+) are not shown. `npm test` fails if they return.

## Known live blockers (do not treat as shipped)

- Waitlist code is in this repo. Live still needs the existing Vercel project connected to Git plus `NOTION_TOKEN` and/or `WAITLIST_NOTIFY_EMAIL` — Linear [SMI-145](https://linear.app/smileing-goats/issue/SMI-145/urgent-replace-fake-waitlist-alert-with-real-email-capture) / [SMI-203](https://linear.app/smileing-goats/issue/SMI-203/founder-attach-omgawdmadeit1sideshot-beer-to-existing-vercel-project)
