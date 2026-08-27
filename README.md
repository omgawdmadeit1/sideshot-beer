# SIDESHOT Beer Co. — live site source

This repository is the **source of truth** for [https://sideshot-beer.vercel.app](https://sideshot-beer.vercel.app).

`omgawdmadeit1/shotgun-beer-company` is the prior task tracker. It is **not** the live site.

## Stack

Static HTML on Vercel plus `/api/waitlist`. Production branch: `main`.

| Path | Role |
| --- | --- |
| `/` | Homepage waitlist (SMI-145). Unsourced metrics removed (SMI-146). |
| `/safeshot` | SafeShot product page (SMI-148). |
| `/shop/safeshot` | Redirects to `/safeshot`. |
| `POST /api/waitlist` | Real capture. Writes Notion SIDESHOT Waitlist when `NOTION_TOKEN` is set. |

## Connect this repo to the existing Vercel project

Do **not** import this as a new Vercel project. That mints a new `*.vercel.app` URL.

1. Open the Vercel project that already serves `sideshot-beer.vercel.app`.
2. **Settings → Git → Connect Git Repository**.
3. Select `omgawdmadeit1/sideshot-beer`.
4. Production branch = `main`.
5. Confirm the next production deploy still aliases to `https://sideshot-beer.vercel.app`.
6. Add project env `NOTION_TOKEN` (integration must access the SIDESHOT Waitlist database).

After that, founder agents can ship by pushing (or opening a PR) on this repo.

## Waitlist honesty

The form never uses `alert()` success. Invalid email, missing 21+ confirmation, or a store failure returns an error. If Notion is not configured, the API returns 503 and says the email was **not** saved.

Local only:

```bash
npm test
npm run dev
```

`WAITLIST_DEV_STORE=1` writes `.data/sideshot-waitlist.json`. That path is disabled when `VERCEL_ENV=production`.

## Agent seating

Seat SIDESHOT site work on **this** GitHub repo, not `gitlab.com/omgawd/lvlltd`.

## Checks

```bash
node check-no-unverified-metrics.mjs
node check-no-fake-waitlist.mjs
```
