# Sync setup — Mac mini + Tailscale (HTTPS)

This makes the meal app installable on your phone and able to pull plans you make
in the Claude desktop app — with **no API key anywhere**. Your Mac mini serves
both the app and a live `sync.json` built from your markdown library.

## How it works
1. You plan in the **Claude desktop app** → your meal-planning skills write to the
   markdown library (`recipes/`, `meal-plans/`, etc.).
2. The Mac mini runs a tiny server (`app-build/app/meal-server.py`) that serves the
   app and rebuilds `sync.json` from those files on demand.
3. On your phone, the app's **Sync** button pulls `sync.json` and merges it in.
   Everything else works offline.

## One-time setup

### 1. Install Tailscale on the Mac mini and your phone
- Download from tailscale.com, sign in with the same account on both.
- This puts both devices on a private encrypted network (free Personal plan).

### 2. Start the server on the Mac mini
```bash
cd "~/Documents/Claude/Projects/Meal planning/app-build/app"
python3 meal-server.py
```
You should see it listening on port 8765. (Python 3 ships with macOS.)

### 3. Expose it over HTTPS on your tailnet
In a second terminal:
```bash
tailscale serve --bg 8765
```
Tailscale prints an HTTPS URL like:
```
https://macmini.<your-tailnet>.ts.net
```
That URL serves the app over HTTPS, with a valid cert, only reachable by your own
devices.

### 4. On your phone
- Make sure Tailscale is connected.
- Open the HTTPS URL in Safari/Chrome.
- Add to Home Screen (Share → Add to Home Screen) — now it's an installable app
  with durable storage.
- Open the app → **More → Sync from Claude**. Leave the address blank (it will use
  the site you opened it from) and keep "Auto-sync when the app opens" on. Tap
  **Sync now** once to confirm.

## Daily use
1. In Claude desktop: "plan my next two weeks…" — the skills update your library.
2. On your phone (on the tailnet): open the app, or tap **↻ Sync** on the Plan tab.
3. Cook, check things off, shop — all offline.

## Keep it always-on (optional)
To run the server automatically at login, create a Launch Agent:
`~/Library/LaunchAgents/com.mealplanner.server.plist`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.mealplanner.server</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>/Users/YOUR_USERNAME/Documents/Claude/Projects/Meal planning/app-build/app/meal-server.py</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/mealplanner-server.log</string>
  <key>StandardErrorPath</key><string>/tmp/mealplanner-server.err</string>
</dict></plist>
```
Replace `YOUR_USERNAME`, then: `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.mealplanner.server.plist`

**Grant Full Disk Access to python3.** A LaunchAgent spawns `/usr/bin/python3` directly,
which macOS blocks from reading anything under `Documents` by default (unlike running
the script from Terminal, where the process inherits Terminal's own permission). Without
this the agent crash-loops silently. Go to **System Settings → Privacy & Security → Full
Disk Access**, click **+**, press **⌘⇧G**, enter `/usr/bin/python3`, add it, and enable
the toggle.

(Keep `tailscale serve --bg 8765` enabled too — it persists across reboots.)

## Deploying updates from GitHub
When you (or Claude) push changes to the repo, pull them onto the Mac mini and restart
the server with:
```bash
cd "~/Documents/Claude/Projects/Meal planning/app-build/app"
./deploy.sh
```
It pulls the current branch with `--ff-only` (refuses to run over uncommitted local
changes), then restarts `com.mealplanner.server` via `launchctl kickstart`. If the
LaunchAgent isn't managing the server (e.g. Full Disk Access isn't granted yet), it
falls back to relaunching `meal-server.py` as a plain background process so the app
doesn't stay down.

## Feedback back to Claude (cook ratings)

When you tap **Sync**, the app now also **pushes** your cook ratings/feedback up to
the Mac mini before pulling the latest plan. The server appends them to an inbox file
in your library:

- `feedback-inbox-test.jsonl` — while the app's **Feedback mode** is set to *Test*
  (default). Use this while you're trying things out; junk ratings land here and are
  ignored.
- `feedback-inbox-prod.jsonl` — when Feedback mode is *Production*.

Set the mode in the app under **More → Sync from Claude → Feedback mode**.

To fold production feedback into your actual recipes, process the prod inbox with the
`cook-feedback` skill in Claude (ask: "apply my logged cooking feedback"), or run an
apply script (ask Claude to generate `apply-feedback.py`). Nothing is written to your
recipe files automatically, so test data can never corrupt them.

## Security notes
- No API key is stored in the app or the server. The server only **reads** your
  local markdown files and serves them.
- With Tailscale, the server is reachable **only by your own devices** — it's not
  on the public internet.
- The app's data lives in your browser's storage on the phone; use the app's
  **Backup & Export** for an extra copy.
