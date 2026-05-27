# Ryder's Homework Tracker

A streak-tracking PWA for Ryder's dyslexia homework. 20 minutes a day, 5 days a week, until 31 March 2027.

## What's in this repo

| File | What it is |
|---|---|
| `index.html` | The whole app. React via CDN, no build step. |
| `manifest.json` | PWA manifest. |
| `worker.js` | Cloudflare Worker for cross-device sync. Deploy this separately. |
| `icon-*.png` / `favicon.png` | App icons. |

## How security works (read this — it explains the design)

There is **no secret key** in `index.html`. The Worker only accepts requests whose `Origin` header matches the GitHub Pages domain you configure. Browsers always send the real `Origin` and cannot be tricked into lying about it, so:

- Random websites can't write to Ryder's data — their `Origin` won't match.
- A determined human with `curl` could send a forged `Origin` and write garbage. The data is just which days he ticked — not worth defending against. If anyone ever does it, delete the KV entry and move on.

If you'd ever want stronger protection (e.g. you're putting this pattern on something more sensitive later), the answer is OAuth via Cloudflare Access — but that's overkill here.

## Setup

### 1. Deploy the Cloudflare Worker

If you already have a worker deployed from the earlier version:

1. Open your worker in the Cloudflare dashboard
2. Replace the code with the new `worker.js`
3. **Edit the `ALLOWED_ORIGINS` array** near the top to include your GitHub Pages URL (e.g. `"https://zanmanna.github.io"` — just the origin, no path)
4. Click **Deploy**
5. Go to **Settings → Variables and Secrets** and **delete the `API_KEY` secret** — it's no longer used

If you're deploying fresh:

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Create Worker**. Name it (e.g. `ryder-sync`)
2. Paste the contents of `worker.js`
3. Edit `ALLOWED_ORIGINS` to match your GitHub Pages URL
4. Deploy
5. Create a KV namespace: **Storage & Databases → KV → Create namespace** called `ryder-storage`
6. Bind it to the worker: **worker → Settings → Bindings → Add → KV namespace**. Variable name: `RYDER_KV`. Namespace: `ryder-storage`. Save.

### 2. Update `index.html`

Open `index.html` and check the CONFIG block near the top of the script:

```js
const CONFIG = {
  SYNC_URL: "https://ryder-sync.zanmanna.workers.dev",
  USER: "ryder",
};
```

Make sure `SYNC_URL` matches your Worker's URL (it should already be filled in correctly for you, Sean).

### 3. Publish on GitHub Pages

1. Create a public repo (e.g. `ryder-homework`)
2. Upload all the files from this folder
3. Settings → Pages → Source: Deploy from a branch → main → / (root) → Save
4. Live at `https://YOURUSERNAME.github.io/<repo-name>/` after a minute

**Important:** the URL where the app lives must match what's in `ALLOWED_ORIGINS` in the Worker. If your repo isn't on `https://zanmanna.github.io`, update that array and redeploy the worker.

## Install on Ryder's devices

**iPad (Safari):** Open the URL → Share → Add to Home Screen.

**Laptop (Chrome/Edge):** Open the URL → install icon in the address bar, or browser menu → Install Ryder's Homework.

## How the streak works

He needs 20 minutes on **5 out of any rolling 7 days** to keep the streak alive. Streak grows by 1 each day the rolling window stays at 5+. Drops below 5 → streak resets to 0. The "LAST 7 DAYS" panel tells him what he needs.

## Prizes

| Streak | Prize |
|---|---|
| 5 days | Extra screen time + extra sweet + free chore day |
| 20 days | Double pocket money + free chore day |
| 60 days | Outing of his choice up to €100 |
| 31 March 2027 | Gift of his choice |

## Maintenance notes

- **Reset his data:** Cloudflare → your worker → Storage → KV → ryder-storage → delete the `state:ryder` entry. Then clear localStorage in his browsers (or just edit `LOCAL_KEY` value in `index.html`).
- **Change prizes/rules:** edit the `milestones` array and the constants near the top of the script in `index.html`. Commit → GitHub Pages redeploys in ~1 min.
- **Custom domain:** if you ever point this at `ryder.zanmanna.com`, add that origin to `ALLOWED_ORIGINS` in the worker and redeploy.
