#!/usr/bin/env python3
"""
Local sync server for the Meal Planning app — runs on your Mac mini.

It does two jobs:
  1. Serves the app's static files (index.html, manifest, sw.js, icons).
  2. Serves a live `sync.json` bundle, rebuilt from your markdown library
     (recipes/, meal-plans/, pantry.md, ...) on every request — so right after
     you plan in the Claude desktop app, a Sync in the phone app pulls the latest.

Run (from app-build/app/):
    python3 meal-server.py
Then expose it over HTTPS on your private network with Tailscale:
    tailscale serve --bg 8765
…and open the printed https URL on your phone. See SYNC-SETUP.md.

No API key, no secrets — this only reads your local files and serves them on
your own machine / tailnet.
"""
import http.server, socketserver, subprocess, sys, os, json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get("MEAL_PORT", "8765"))


def build_bundle():
    # Regenerate seed.json from the live markdown library.
    subprocess.run([sys.executable, "build_seed.py"], cwd=SCRIPT_DIR, check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with open(os.path.join(SCRIPT_DIR, "seed.json"), encoding="utf-8") as f:
        bundle = json.load(f)
    # Keep review drafts available in the bundle without activating them.
    def maxdate(p):
        ds = [e.get("dayDate") for e in p.get("entries", []) if e.get("dayDate")]
        return max(ds) if ds else ""
    plans = bundle.get("mealPlans", [])
    final_plans = [p for p in plans if not p.get("isDraft")]
    if final_plans:
        newest = max(final_plans, key=maxdate)
        for p in plans:
            p["isActive"] = (p is newest)
    return bundle


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=SCRIPT_DIR, **k)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        if self.path.split("?")[0] == "/feedback":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                body = json.loads(self.rfile.read(length).decode("utf-8")) if length else {}
                entries = body.get("entries", [])
                # Route entries to a per-environment inbox so test/junk data never
                # mixes with production feedback. Apply prod inbox to recipes deliberately.
                import collections
                buckets = collections.defaultdict(list)
                for e in entries:
                    buckets[(e.get("env") or "test")].append(e)
                written = 0
                base = os.path.join(SCRIPT_DIR, "..", "..")  # Meal planning/
                for env, items in buckets.items():
                    safe = "prod" if env == "production" else "test"
                    path = os.path.join(base, f"feedback-inbox-{safe}.jsonl")
                    with open(path, "a", encoding="utf-8") as f:
                        for it in items:
                            f.write(json.dumps(it, ensure_ascii=False) + "\n")
                            written += 1
                payload = json.dumps({"ok": True, "written": written}).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return
        self.send_response(404); self.end_headers()

    def do_GET(self):
        if self.path.split("?")[0] in ("/sync.json", "/sync"):
            try:
                payload = json.dumps(build_bundle()).encode("utf-8")
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        return super().do_GET()

    def log_message(self, fmt, *args):
        pass  # quiet


if __name__ == "__main__":
    os.chdir(SCRIPT_DIR)
    with socketserver.ThreadingTCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"Meal Planning server running on port {PORT}")
        print(f"  App:   http://localhost:{PORT}/index.html")
        print(f"  Data:  http://localhost:{PORT}/sync.json")
        print(f"\nExpose over HTTPS on your tailnet:  tailscale serve --bg {PORT}")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
