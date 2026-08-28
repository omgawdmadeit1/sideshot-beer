# Founder: attach this repo to the existing Vercel project

Linear: [SMI-203](https://linear.app/smileing-goats/issue/SMI-203/founder-attach-omgawdmadeit1sideshot-beer-to-existing-vercel-project).
Do **not** create a second Vercel project. Agents cannot complete the Git OAuth click.

After this attach, merge `cursor/sideshot-waitlist-capture-7085` (SMI-145). Set waitlist env vars **before** that merge so the first real-capture deploy is not a 503.

## Confirm you are in the existing project

1. Open [https://vercel.com/login](https://vercel.com/login) as the account that already owns [https://sideshot-beer.vercel.app](https://sideshot-beer.vercel.app).
2. Open [https://vercel.com/dashboard](https://vercel.com/dashboard).
3. Search `sideshot-beer` and open the project whose **Domains** already lists `sideshot-beer.vercel.app`.
4. Stop if the page is **Add New… / Import Git Repository / Create Project**. That mints a new `*.vercel.app` hostname. Close it. Do not deploy it.

## Attach Git (exact clicks)

5. Left nav → **Settings**.
6. Settings tabs → **Git**.
7. **Connect Git Repository** (not Import).
8. Provider = **GitHub**. If Vercel asks to install/authorize the GitHub App, grant it `omgawdmadeit1` (or just `sideshot-beer`).
9. Select **`omgawdmadeit1/sideshot-beer`**.
10. Production branch = **`main`**.
    - Settings → Git → Production Branch, or
    - Settings → Environments → Production → Branch Tracking → `main`.
11. Settings → **Domains**. Confirm `sideshot-beer.vercel.app` is still listed and stays the production alias.
12. Deployments: the next production deploy must still be that same project. A new `something-xxx.vercel.app` means the wrong project was created — delete only the new one.

## Waitlist env vars (set on this same project, Production)

Settings → **Environment Variables** → add for **Production** (also Preview if you want PR previews to capture):

| Name | Required | Value |
| --- | --- | --- |
| `NOTION_TOKEN` | At least one of this or `WAITLIST_NOTIFY_EMAIL` | Internal integration secret (see Notion clicks below). Never commit it. |
| `NOTION_WAITLIST_DATABASE_ID` | If using Notion | `2c3dc9f4c4454e3ebd1248d8aaed2818` |
| `WAITLIST_NOTIFY_EMAIL` | At least one of this or `NOTION_TOKEN` | `josephlamartaylor@icloud.com` |
| `RESEND_API_KEY` | Optional | If set with a valid notify email, Resend is used instead of FormSubmit. |
| `RESEND_FROM` | Optional | `SIDESHOT <onboarding@resend.dev>` until a verified domain exists. |
| `ALLOW_LOCAL_WAITLIST` | Do not set in production | Local JSON is **dev only**. Production with no Notion/notify store returns 503, not a fake join. |

Recommended production pair: **`NOTION_TOKEN` + `WAITLIST_NOTIFY_EMAIL`**. The waitlist handler fail-closes unless at least one durable store accepts the write.

### Notion token clicks

1. Open [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations).
2. **New integration** → name `SIDESHOT Waitlist` → associated workspace that owns the waitlist DB → submit.
3. Copy the **Internal Integration Secret**. That is `NOTION_TOKEN`.
4. Open the existing DB: [SIDESHOT Waitlist](https://app.notion.com/p/2c3dc9f4c4454e3ebd1248d8aaed2818).
5. `•••` (top right) → **Connections** → connect `SIDESHOT Waitlist`.
6. Paste the token into Vercel as `NOTION_TOKEN`. Database id is already defaulted in code; still set `NOTION_WAITLIST_DATABASE_ID=2c3dc9f4c4454e3ebd1248d8aaed2818` so it is explicit.

### Cursor / agent env (optional, after Git attach)

- Cursor Desktop → Settings → MCP → authenticate **Vercel** (Cloud Agents cannot finish this OAuth).
- Optional for CLI / GitHub Actions fallback: `VERCEL_TOKEN` from [https://vercel.com/account/tokens](https://vercel.com/account/tokens), plus `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` from the **existing** project Settings → General.

## After attach

Reply **linked** on SMI-203 (or move the issue). Then merge SMI-145 branch `cursor/sideshot-waitlist-capture-7085` into `main`. Do not merge the kitchen-sink `cursor/smi-232-site-source-of-truth-1d72` for this step.

Compare (open PR if one is not already open):
https://github.com/omgawdmadeit1/sideshot-beer/compare/main...cursor/sideshot-waitlist-capture-7085?quick_pull=1
