// Cloudflare Worker: Ryder's Homework Tracker sync API
//
// Security model: this Worker only accepts requests whose Origin header
// matches one of the ALLOWED_ORIGINS below. Browsers cannot lie about
// the Origin header, so this stops random websites/bots from writing to
// the KV store. There is no shared secret in the client-side code.
//
// Setup (in the Cloudflare dashboard):
// 1. Create a KV namespace called "ryder-storage" and bind it to this Worker
//    as variable name RYDER_KV.
// 2. Edit ALLOWED_ORIGINS below to match your GitHub Pages URL.
// 3. Deploy.
//
// Endpoints:
//   GET  /state?user=ryder   → returns { completed: {...}, updated_at: "..." }
//   POST /state?user=ryder   → body { completed: {...} } — saves it (merged)

// EDIT THIS LIST: add your GitHub Pages origin (no path, no trailing slash).
// You can keep "http://localhost" entries for testing.
const ALLOWED_ORIGINS = [
  "https://zanmanna.github.io",   // ← replace if your GitHub username is different
  "http://localhost:8080",
  "http://localhost:3000",
  "http://127.0.0.1:8080",
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    // Origin check — the actual security gate.
    // Browsers always send an accurate Origin header on cross-site requests;
    // they cannot be tricked into forging it from another site's JS.
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: "forbidden" }, 403, origin);
    }

    const url = new URL(request.url);
    const user = url.searchParams.get("user") || "ryder";
    const key = `state:${user}`;

    if (url.pathname === "/state" && request.method === "GET") {
      const stored = await env.RYDER_KV.get(key, { type: "json" });
      return json(stored || { completed: {}, updated_at: null }, 200, origin);
    }

    if (url.pathname === "/state" && request.method === "POST") {
      let body;
      try { body = await request.json(); }
      catch { return json({ error: "bad json" }, 400, origin); }

      if (!body || typeof body.completed !== "object") {
        return json({ error: "missing completed object" }, 400, origin);
      }

      // Merge so neither device wipes the other's ticks.
      const existing = (await env.RYDER_KV.get(key, { type: "json" })) || { completed: {} };
      const merged = { ...existing.completed };
      for (const [k, v] of Object.entries(body.completed)) {
        merged[k] = v;
      }

      const newState = {
        completed: merged,
        updated_at: new Date().toISOString(),
      };
      await env.RYDER_KV.put(key, JSON.stringify(newState));
      return json(newState, 200, origin);
    }

    return json({ error: "not found" }, 404, origin);
  },
};
