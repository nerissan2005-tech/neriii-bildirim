const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const { AFF_CATS, AFF } = require("./olumlamalar");

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
const db = admin.firestore();
const messaging = admin.messaging();

const ROOT_EMAIL = (process.env.ROOT_EMAIL || "neriii@nerii.app").toLowerCase();
const CRON_KEY = process.env.CRON_KEY || "";
const allowed = (process.env.ALLOWED_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
const DAY_MS = 86400000;
const PRAYER_NAMES = ["İnşirah Suresi'ni", "Yunus Duası'nı", "Hz. Musa'nın duasını", "İhlas Suresi'ni", "Kevser Suresi'ni", "Felak Suresi'ni", "Nas Suresi'ni"];

const app = express();
app.use(cors({ origin: (origin, cb) => cb(null, !origin || !allowed.length || allowed.includes(origin)) }));
app.use(express.json({ limit: "20kb" }));

function rng(seed) {
  return () => {
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const AFF_PER = Math.min(...AFF_CATS.map(c => AFF[c].length));
const AFF_CYCLE = AFF_PER * AFF_CATS.length;
const shuffleCache = {};
function shuffled(cat, cycle) {
  const key = cat + "|" + cycle;
  if (shuffleCache[key]) return shuffleCache[key];
  const a = AFF[cat].slice();
  const r = rng(9157 + cycle * 7919 + AFF_CATS.indexOf(cat) * 131);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return (shuffleCache[key] = a);
}
function affAt(i) {
  const cycle = Math.floor(i / AFF_CYCLE), r = i % AFF_CYCLE;
  const cat = AFF_CATS[r % AFF_CATS.length];
  return { cat, text: shuffled(cat, cycle)[Math.floor(r / AFF_CATS.length)] };
}

function localParts(tz) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  const p = Object.fromEntries(f.formatToParts(new Date()).map(x => [x.type, x.value]));
  const hour = Number(p.hour) % 24;
  return { date: p.year + "-" + p.month + "-" + p.day, minutes: hour * 60 + Number(p.minute) };
}
const utcDay = k => { const [y, m, d] = k.split("-").map(Number); return Date.UTC(y, m - 1, d); };

async function sendTo(uid, data) {
  const col = db.collection("userdata").doc(uid).collection("tokens");
  const snap = await col.get();
  const docs = snap.docs.filter(d => d.data().token);
  if (!docs.length) return 0;
  const payload = {};
  Object.entries(data).forEach(([k, v]) => { if (v != null) payload[k] = String(v); });
  const res = await messaging.sendEachForMulticast({
    tokens: docs.map(d => d.data().token),
    data: payload,
    webpush: { headers: { Urgency: "high", TTL: "86400" } }
  });
  const dead = [];
  res.responses.forEach((r, i) => {
    const code = r.error && r.error.code;
    if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token" || code === "messaging/invalid-argument") dead.push(docs[i].ref.delete());
  });
  await Promise.all(dead);
  return res.successCount;
}

async function authUser(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return admin.auth().verifyIdToken(token);
}

app.get("/", (req, res) => res.json({ ok: true }));

app.post("/notify-message", async (req, res) => {
  try {
    const user = await authUser(req);
    const id = req.body && req.body.id;
    if (!id || typeof id !== "string") return res.status(400).json({ error: "gecersiz" });
    const m = await db.collection("messages").doc(id).get();
    if (!m.exists) return res.status(404).json({ error: "yok" });
    const d = m.data();
    if (d.from !== user.uid || d.unsent || Date.now() - (d.at || 0) > 5 * 60000 || d.pushed) return res.json({ ok: true, sent: 0 });
    await m.ref.update({ pushed: true });
    const st = await db.collection("userdata").doc(d.to).collection("notify").doc("settings").get();
    if (st.exists && st.data().msgOn === false) return res.json({ ok: true, sent: 0 });
    const body = d.sticker ? "Sana bir çıkartma gönderdi ✨" : (d.text || "").slice(0, 140);
    const sent = await sendTo(d.to, { title: (d.fromName || "Neriii") + " sana yazdı", body, view: "messages", chatWith: d.from, tag: "msg-" + d.from });
    res.json({ ok: true, sent });
  } catch (e) {
    res.status(401).json({ error: "oturum" });
  }
});

app.post("/notify-announcement", async (req, res) => {
  try {
    const user = await authUser(req);
    let ok = (user.email || "").toLowerCase() === ROOT_EMAIL;
    if (!ok) {
      const p = await db.collection("profiles").doc(user.uid).get();
      ok = p.exists && p.data().role === "admin" && !p.data().disabled;
    }
    if (!ok) return res.status(403).json({ error: "yetki" });
    const site = await db.collection("config").doc("site").get();
    const text = site.exists ? (site.data().announcement || "") : "";
    if (!text) return res.json({ ok: true, sent: 0 });
    const profiles = await db.collection("profiles").get();
    let sent = 0;
    for (const p of profiles.docs) {
      if (p.data().disabled) continue;
      sent += await sendTo(p.id, { title: "Neriii'den duyuru 📣", body: text.slice(0, 160), view: "home", tag: "duyuru" });
    }
    res.json({ ok: true, sent });
  } catch (e) {
    res.status(401).json({ error: "oturum" });
  }
});

app.get("/tick", async (req, res) => {
  if (!CRON_KEY || req.query.key !== CRON_KEY) return res.status(403).json({ error: "yetki" });
  let sent = 0;
  try {
    const profiles = await db.collection("profiles").get();
    for (const p of profiles.docs) {
      if (p.data().disabled) continue;
      const ref = db.collection("userdata").doc(p.id).collection("notify").doc("settings");
      const st = await ref.get();
      if (!st.exists) continue;
      const s = st.data();
      const now = localParts(s.tz);
      const due = (time, last) => {
        if (!/^\d{2}:\d{2}$/.test(time || "") || last === now.date) return false;
        const [hh, mm] = time.split(":").map(Number);
        const target = hh * 60 + mm;
        return now.minutes >= target && now.minutes <= target + 20;
      };
      if (s.affOn !== false && due(s.affTime || "07:45", s.lastAff)) {
        await ref.set({ lastAff: now.date }, { merge: true });
        const ud = await db.collection("userdata").doc(p.id).get();
        let start = now.date;
        try { start = JSON.parse(ud.data().json).affStart || now.date; } catch (e) {}
        const idx = Math.max(0, Math.round((utcDay(now.date) - utcDay(start)) / DAY_MS));
        const a = affAt(idx);
        sent += await sendTo(p.id, { title: "Günün olumlaması ✨ " + a.cat, body: a.text, view: "affirm", tag: "olumlama" });
      }
      if (s.prayOn !== false && due(s.prayTime || "21:00", s.lastPray)) {
        await ref.set({ lastPray: now.date }, { merge: true });
        const idx = Math.round(utcDay(now.date) / DAY_MS);
        const name = PRAYER_NAMES[((idx % PRAYER_NAMES.length) + PRAYER_NAMES.length) % PRAYER_NAMES.length];
        sent += await sendTo(p.id, { title: "Duanı okumayı unutma 🤲", body: "Bugün " + name + " okumaya ne dersin? Kalbine huzur olsun.", view: "prayers", tag: "dua" });
      }
    }
    res.json({ ok: true, sent });
  } catch (e) {
    res.status(500).json({ error: "hata" });
  }
});

app.listen(process.env.PORT || 3000);
