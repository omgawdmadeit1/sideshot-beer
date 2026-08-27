# SIDESHOT Beer Co. — live site source

This repository is the **source of truth** for [https://sideshot-beer.vercel.app](https://sideshot-beer.vercel.app).

`omgawdmadeit1/shotgun-beer-company` is the prior task tracker. It is **not** the live site.

## Stack

Static `index.html` on Vercel. Production branch: `main`.

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

## Known live bugs (do not treat as shipped)

- Waitlist still uses a fake `alert()` — Linear [SMI-145](https://linear.app/smileing-goats/issue/SMI-145/urgent-replace-fake-waitlist-alert-with-real-email-capture)
- Homepage metrics are unsourced — Linear [SMI-146](https://linear.app/smileing-goats/issue/SMI-146/remove-unverified-metrics-from-live-homepage)
