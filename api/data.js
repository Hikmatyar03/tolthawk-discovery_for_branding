// Vercel serverless function. Storage: Upstash Redis (Vercel Marketplace).
const U = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const T = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function r(cmd) {
  const x = await fetch(U, { method: "POST", headers: { Authorization: "Bearer " + T, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  const j = await x.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
const cut = (s, n) => String(s || "").slice(0, n);

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (!U || !T) return res.status(500).json({ error: "Storage not configured" });
    const admin = !!process.env.ADMIN_KEY && req.headers["x-admin-key"] === process.env.ADMIN_KEY;
    const comments = async () => (await r(["LRANGE", "comments", 0, -1])).map((x) => JSON.parse(x));

    if (req.method === "GET") {
      if (req.query.admin) {
        if (!admin) return res.status(401).json({ error: "unauthorized" });
        const ids = await r(["SMEMBERS", "resps"]);
        const rows = ids.length ? (await r(["MGET", ...ids.map((i) => "resp:" + i)])).filter(Boolean).map((x) => { const o = JSON.parse(x); delete o.state; return o; }) : [];
        return res.json({ responses: rows, comments: await comments() });
      }
      if (req.query.resume) {
        const rid = cut(req.query.resume, 40).replace(/[^\w-]/g, "");
        const p = await r(["GET", "resp:" + rid]);
        if (!p) return res.json({});
        const o = JSON.parse(p);
        return res.json({ who: o.who, state: o.state, pos: o.pos, submitted: o.submitted });
      }
      const screen = cut(req.query.screen, 40);
      return res.json({ comments: (await comments()).filter((c) => c.screen === screen) });
    }

    if (req.method === "POST") {
      const b = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      const id = cut(b.id, 40).replace(/[^\w-]/g, "");
      if (b.type === "answers") {
        if (!id || !Array.isArray(b.answers)) return res.status(400).json({ error: "bad request" });
        const prev = await r(["GET", "resp:" + id]);
        const old = prev ? JSON.parse(prev) : {};
        const row = {
          id, who: cut(b.who, 80), pos: +b.pos || 0, state: JSON.stringify(b.state || []).length < 90000 ? b.state : old.state, updated: new Date().toISOString(),
          submitted: b.submit ? new Date().toISOString() : old.submitted || null,
          answers: b.answers.slice(0, 60).map((a) => ({ n: +a.n, q: cut(a.q, 300), a: cut(a.a, 4000) })),
        };
        await r(["SET", "resp:" + id, JSON.stringify(row)]);
        await r(["SADD", "resps", id]);
        return res.json({ ok: true });
      }
      if (b.type === "comment") {
        const text = cut(b.text, 2000).trim();
        if (!text || !b.screen) return res.status(400).json({ error: "bad request" });
        const c = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), rid: id, who: cut(b.who, 80), screen: cut(b.screen, 40), label: cut(b.label, 200), text, ts: Date.now(), role: admin ? "designer" : "client" };
        await r(["RPUSH", "comments", JSON.stringify(c)]);
        return res.json({ ok: true });
      }
    }
    res.status(400).json({ error: "bad request" });
  } catch (e) {
    res.status(500).json({ error: "server error" });
  }
};
