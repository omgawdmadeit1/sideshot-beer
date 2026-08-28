# SIDESHOT Beer Co. — live site source

This repository is the **source of truth** for [https://sideshot-beer.vercel.app](https://sideshot-beer.vercel.app).

`omgawdmadeit1/shotgun-beer-company` is the prior task tracker. It is **not** the live site.

## Stack

Static HTML on Vercel plus `POST /api/waitlist`. Production branch: `main`.

| Path | Role |
| --- | --- |
| `/` | Homepage waitlist (SMI-145). SIDESHOT™ lockup (SMI-209). Unsourced metrics removed (SMI-146). |
| `/safeshot` | SafeShot™ product page (SMI-148). Price not set. Waitlist CTA. |
| `/shop/safeshot` | Redirects to `/safeshot`. |
| `POST /api/waitlist` | Real capture. Writes Notion SIDESHOT Waitlist when `NOTION_TOKEN` is set. |
| `GET /api/config` | Returns `preorderUrl` only when `SAFESHOT_PREORDER_URL` is set. |

## Waitlist (SMI-145)

Homepage and SafeShot forms post to `/api/waitlist` (also `/api/sideshot/waitlist`). Signups require a valid email and 21+ confirmation. Success is only returned after a store accepts the write.

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

Exact founder clicks + waitlist env vars (`NOTION_TOKEN` / `WAITLIST_NOTIFY_EMAIL`) are in [`docs/vercel-git-attach.md`](docs/vercel-git-attach.md) (Linear SMI-203). After Git attach, merge this branch into `main`.

## Agent seating

Seat SIDESHOT site work on **this** GitHub repo, not `gitlab.com/omgawd/lvlltd`.

## Homepage metrics (SMI-146)

Unverified numbers (3.8s / 99.8% / $0.65 / 70%+) are not shown. `npm test` fails if they return.

## Known live blockers (do not treat as shipped)

- Waitlist and SafeShot code are in this repo. Live still needs the existing Vercel project connected to Git plus `NOTION_TOKEN` and/or `WAITLIST_NOTIFY_EMAIL` — Linear [SMI-145](https://linear.app/smileing-goats/issue/SMI-145/q4-goal-replace-fake-waitlist-with-real-email-capture) / [SMI-203](https://linear.app/smileing-goats/issue/SMI-203/founder-attach-omgawdmadeit1sideshot-beer-to-existing-vercel-project)
