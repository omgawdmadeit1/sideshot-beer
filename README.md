# SIDESHOT Beer Co. — live site source

This repository is the **source of truth** for [https://sideshot-beer.vercel.app](https://sideshot-beer.vercel.app).

`omgawdmadeit1/shotgun-beer-company` is the prior task tracker. It is **not** the live site.

## Stack

Static `index.html` on Vercel. Production branch: `main`.

## Connect this repo to the existing Vercel project

Do **not** import this as a new Vercel project. That mints a new `*.vercel.app` URL.

Exact founder clicks + waitlist env vars (`NOTION_TOKEN` / `WAITLIST_NOTIFY_EMAIL`) are in [`docs/vercel-git-attach.md`](docs/vercel-git-attach.md) (Linear SMI-203). After Git attach, merge `cursor/sideshot-waitlist-capture-7085` (SMI-145).

## Agent seating

Seat SIDESHOT site work on **this** GitHub repo, not `gitlab.com/omgawd/lvlltd`.

## Known live bugs (do not treat as shipped)

- Waitlist still uses a fake `alert()` — Linear [SMI-145](https://linear.app/smileing-goats/issue/SMI-145/urgent-replace-fake-waitlist-alert-with-real-email-capture)
- Homepage metrics are unsourced — Linear [SMI-146](https://linear.app/smileing-goats/issue/SMI-146/remove-unverified-metrics-from-live-homepage)
