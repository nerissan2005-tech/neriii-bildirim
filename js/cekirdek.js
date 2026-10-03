const SOFT_NOTES = [
  "Küçük mutluluklar büyük farklar yaratır ♡",
  "Kendine iyi bak, her şey yolunda olacak ♡",
  "Yavaş gitmek de ilerlemektir ♡",
  "Bugün bir bardak su, bir derin nefes ♡",
  "Kendine teşekkür etmeyi unutma ♡"
];
const MOODS = [["Harika", "🌞"], ["İyi", "🙂"], ["Normal", "😐"], ["Yorgun", "😴"], ["Zor bir gün", "🌧️"]];
const AREAS = ["Kişisel", "Sağlık", "Kariyer", "İlişkiler", "Finans", "Seyahat"];
const BOOK_STATUSES = ["Okunacak", "Okunuyor", "Bitti"];
const PRAYER_CATS = ["Sabah", "Akşam", "Şükür", "Şifa", "Bereket", "Koruma", "Aile", "Diğer"];
const WEATHER = { 0: "Güneşli", 1: "Çoğunlukla açık", 2: "Parçalı bulutlu", 3: "Kapalı", 45: "Sisli", 48: "Sisli", 51: "Çisenti", 53: "Çisenti", 55: "Çisenti", 61: "Hafif yağmurlu", 63: "Yağmurlu", 65: "Kuvvetli yağmur", 71: "Hafif kar", 73: "Karlı", 75: "Yoğun kar", 80: "Sağanak", 81: "Sağanak", 82: "Kuvvetli sağanak", 95: "Gök gürültülü", 96: "Dolu", 99: "Dolu" };

const DAY_MS = 86400000;
const STORE = "nerii-v2";
const pad = n => String(n).padStart(2, "0");
const keyOf = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const fromKey = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const firstOfMonth = d => new Date(d.getFullYear(), d.getMonth(), 1);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtLong = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const fmtDate = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" });
const fmtShort = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });
const fmtWd = new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric" });
const fmtMonth = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });
const fmtTime = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

let today = new Date(); today.setHours(0, 0, 0, 0);
let todayKey = keyOf(today);
const $ = id => document.getElementById(id);

async function sha256(t) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
}
let adminUnlocked = false;
try { adminUnlocked = sessionStorage.getItem("nerii-admin") === "1"; } catch (e) {}
async function currentAdminHash() {
  const d = await db.collection("config").doc("admin").get();
  return d.exists && d.data().passHash ? d.data().passHash : DEFAULT_ADMIN_HASH;
}

function applyTheme() {
  let t = "auto";
  try { t = (typeof data !== "undefined" && data && data.theme) || localStorage.getItem("neriii-theme") || "auto"; } catch (e) {}
  try { localStorage.setItem("neriii-theme", t); } catch (e) {}
  const dark = t === "dark" || (t === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.content = dark ? "#1A1320" : "#2B1B2E";
}
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => applyTheme());

function defaults() {
  return { city: "", journal: {}, favAff: [], affStart: todayKey, visPref: {}, v3: true };
}

let data = defaults();
let me = null;
let auth = null, db = null;
let allProfiles = [];
let profiles = [];
let msgsIn = [], msgsOut = [];
let pubItems = new Map(), myItems = new Map(), someItems = new Map();
let itemsCache = null;
let site = {};
let unsubs = [];
let saveTimer = null;
let pendingRender = false;
let loginNotice = "";

function pushData() {
  clearTimeout(saveTimer); saveTimer = null;
  if (!me || !db) return;
  db.collection("userdata").doc(me.uid).set({ json: JSON.stringify(data), at: Date.now() })
    .catch(() => showToast("Kaydedilemedi", "İnternet bağlantını kontrol et, değişiklikler tekrar denenecek."));
}
function save() {
  if (!me) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(pushData, 800);
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") { if (saveTimer) pushData(); flushItems(); } });
window.addEventListener("pagehide", () => { if (saveTimer) pushData(); flushItems(); });


function h(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") n.className = v;
    else if (k === "text") n.textContent = v;
    else if (k === "html") n.innerHTML = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (typeof v === "boolean") n[k] = v;
    else n.setAttribute(k, v);
  }
  kids.flat().forEach(c => { if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(c)); });
  return n;
}


const state = { view: "home", calMonth: firstOfMonth(today), sel: todayKey, noteId: null, jDate: todayKey, affFilter: "Tümü", focus: null };


function dayIndex(d, len) {
  const n = Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / DAY_MS);
  return ((n % len) + len) % len;
}
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
  return { cat, text: shuffled(cat, cycle)[Math.floor(r / AFF_CATS.length)], date: addDays(fromKey(data.affStart), i) };
}
const affDay = () => Math.max(0, Math.round((today - fromKey(data.affStart)) / DAY_MS));
const todayAff = () => affAt(affDay());
const affirmation = () => todayAff().text;
const catTag = c => h("span", { class: "cat", style: "--c:" + (CAT_COLORS[c] || "#8A7A86"), text: c });
const isFav = t => data.favAff.includes(t);
function toggleFav(t) {
  data.favAff = isFav(t) ? data.favAff.filter(x => x !== t) : data.favAff.concat(t);
  save(); render();
}
const softNote = () => SOFT_NOTES[dayIndex(today, SOFT_NOTES.length)];
const pendingJournal = {};
const journalOf = k => listOf("journal").find(i => i.date === k && isMine(i)) || pendingJournal[k] || null;
function ensureJournal(k) {
  let it = journalOf(k);
  if (it) return it;
  const fields = { date: k, mood: "", gratitude: ["", "", ""], text: "" };
  const aud = audFields(getVis("journal"));
  const id = addItem("journal", fields, aud);
  it = Object.assign({ id, kind: "journal", owner: me.uid, ownerName: me.name, at: Date.now() }, aud, fields);
  pendingJournal[k] = it;
  return it;
}

function allItems() {
  if (!itemsCache) { itemsCache = new Map(pubItems); someItems.forEach((v, k) => itemsCache.set(k, v)); myItems.forEach((v, k) => itemsCache.set(k, v)); }
  return itemsCache;
}
const listOf = kind => [...allItems().values()].filter(i => i.kind === kind).sort((a, b) => a.at - b.at);
const isMine = i => i.owner === me.uid;
const canDel = i => isMine(i) || (me.isAdmin && i.vis === "public");
const plansOn = k => listOf("plan").filter(i => i.date === k);
const doneOf = hb => ((hb.done || {})[me.uid]) || {};
const audDefault = () => ({ vis: "private", mode: "only", people: [] });
const audState = kind => (state.aud || (state.aud = {}))[kind] || (state.aud[kind] = audDefault());
function getVis(kind) {
  const cur = audState(kind);
  state.aud[kind] = audDefault();
  return { vis: cur.vis, mode: cur.mode, people: cur.people.slice() };
}
const otherMembers = () => allProfiles.filter(p => p.uid !== me.uid && !p.disabled).map(p => p.uid);
function audFields(a) {
  if (!a || typeof a === "string") return { vis: a === "public" ? "public" : "private", viewers: [], mode: "", except: [] };
  if (a.vis !== "some") return { vis: a.vis === "public" ? "public" : "private", viewers: [], mode: "", except: [] };
  if (a.mode === "except") return { vis: "some", mode: "except", except: a.people.slice(), viewers: otherMembers().filter(u => !a.people.includes(u)) };
  return { vis: "some", mode: "only", except: [], viewers: a.people.filter(u => u !== me.uid) };
}
const audOf = it => ({ vis: it.vis || "private", mode: it.mode === "except" ? "except" : "only", people: (it.mode === "except" ? it.except : it.viewers || []).slice() });
const itemsCol = () => db.collection("items");
const writeFail = () => showToast("Kaydedilemedi", "İnternet bağlantını kontrol edip tekrar dene.");

function addItem(kind, fields, aud) {
  const ref = itemsCol().doc();
  ref.set(Object.assign({ kind, owner: me.uid, ownerName: me.name, at: Date.now(), upd: Date.now(), updName: me.name }, audFields(aud), fields)).catch(writeFail);
  return ref.id;
}
const pendingPatch = new Map();
function flushItem(id) {
  const x = pendingPatch.get(id);
  if (!x) return;
  clearTimeout(x.t);
  pendingPatch.delete(id);
  itemsCol().doc(id).update(x.patch).catch(writeFail);
}
function flushItems() { [...pendingPatch.keys()].forEach(flushItem); }
function updItem(it, patch, lazy) {
  Object.assign(it, patch);
  const prev = pendingPatch.get(it.id);
  const p = Object.assign(prev ? prev.patch : {}, patch, { upd: Date.now(), updName: me.name });
  if (prev) clearTimeout(prev.t);
  if (!lazy) { pendingPatch.delete(it.id); itemsCol().doc(it.id).update(p).catch(writeFail); return; }
  pendingPatch.set(it.id, { patch: p, t: setTimeout(() => flushItem(it.id), 600) });
}
function ask(o) {
  return new Promise(resolve => {
    const prev = document.activeElement;
    const root = $("dialog");
    const close = v => {
      root.classList.remove("show");
      document.removeEventListener("keydown", onKey, true);
      setTimeout(() => { root.hidden = true; root.replaceChildren(); if (prev && prev.focus) try { prev.focus(); } catch (e) {} }, 160);
      resolve(v);
    };
    const onKey = e => {
      if (e.key === "Escape") { e.preventDefault(); close(false); }
      if (e.key === "Tab") {
        const f = [...root.querySelectorAll("input, button")];
        const i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    };
    const errEl = o.input ? h("p", { class: "err", style: "min-height:1.2em;margin:.6rem 0 0" }) : null;
    const inputEl = o.input ? h("input", { class: "field", id: "dlgInput", type: o.input, placeholder: o.placeholder || "", autocomplete: "off", style: "width:100%;margin-top:1rem",
      onkeydown: e => { if (e.key === "Enter") { e.preventDefault(); okBtn.click(); } } }) : null;
    const okBtn = h("button", { class: "btn " + (o.danger ? "danger-fill" : "primary"), type: "button", text: o.ok || "Tamam", onclick: () => {
      if (!inputEl) return close(true);
      const bad = o.validate ? o.validate(inputEl.value) : "";
      if (bad) { errEl.textContent = bad; inputEl.focus(); return; }
      close(inputEl.value);
    } });
    root.replaceChildren(
      h("div", { class: "dlg-back", onclick: () => close(false) }),
      h("div", { class: "dlg", role: "alertdialog", "aria-modal": "true", "aria-labelledby": "dlgTitle", "aria-describedby": "dlgText" },
        h("span", { class: "dlg-ic" + (o.danger ? " danger" : ""), html: ico(o.icon || (o.danger ? "trash" : "heart"), 26) }),
        h("h2", { id: "dlgTitle", text: o.title }),
        o.text ? h("p", { id: "dlgText", text: o.text }) : null,
        inputEl, errEl,
        h("div", { class: "dlg-actions" },
          o.cancel === false ? null : h("button", { class: "btn", type: "button", text: o.cancel || "Vazgeç", onclick: () => close(false) }),
          okBtn)
      )
    );
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add("show"));
    document.addEventListener("keydown", onKey, true);
    (inputEl || okBtn).focus();
  });
}

async function delItem(it, q) {
  if (q && !(await ask({ title: q, text: "Bu işlem geri alınamaz.", ok: "Sil", danger: true }))) return;
  pendingPatch.delete(it.id);
  itemsCol().doc(it.id).delete().catch(writeFail);
}
function toggleHabit(hb, k, on) {
  if (on && k === todayKey) petAward("aliskanlik", 5);
  const F = firebase.firestore;
  itemsCol().doc(hb.id).update(new F.FieldPath("done", me.uid, k), on ? true : F.FieldValue.delete(), "upd", Date.now()).catch(writeFail);
}

let renderQueued = false;
function scheduleRender() {
  if (!me || renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    if (!me) return;
    const a = document.activeElement;
    if (a && a.classList && a.classList.contains("live") && $("view").contains(a)) { pendingRender = true; updateHeader(); return; }
    pendingRender = false;
    render();
  });
}
document.addEventListener("focusout", e => {
  if (!e.target.classList || !e.target.classList.contains("live")) return;
  setTimeout(() => {
    const a = document.activeElement;
    if (a && a.classList && a.classList.contains("live")) return;
    flushItems();
    if (pendingRender) { pendingRender = false; render(); }
  }, 60);
});

function go(view, opts) {
  if (!VIEWS.some(v => v[0] === view) || (view === "admin" && !(me && me.isAdmin))) view = "home";
  state.view = view;
  Object.assign(state, opts || {});
  if (view === "messages") $("toast").hidden = true;
  if (location.hash.slice(1) !== view) history.replaceState(null, "", "#" + view);
  flushItems();
  pendingRender = false;
  render();
  window.scrollTo(0, 0);
}

function render() {
  if (!me) return;
  const more = !TAB_MAIN.includes(state.view);
  document.querySelectorAll("#tabbar button").forEach(b => {
    const on = b.dataset.view === state.view || (b.dataset.view === "more" && more);
    if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  const navView = (typeof NAV_ALIAS !== "undefined" && NAV_ALIAS[state.view]) || state.view;
  document.querySelectorAll("#nav button").forEach(b => {
    if (b.dataset.view === navView) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  const act = document.activeElement;
  const keepId = act && act.id && $("view").contains(act) ? act.id : null;
  const keepVal = keepId && act.type !== "checkbox" && act.type !== "range" && "value" in act ? act.value : null;
  const caret = keepId && typeof act.selectionStart === "number" ? act.selectionStart : null;
  $("view").replaceChildren(RENDER[state.view]());
  updateHeader();
  if (keepId && !state.focus) {
    const f = $(keepId);
    if (f) {
      if (keepVal != null && f.value !== keepVal) f.value = keepVal;
      f.focus();
      if (caret != null && typeof f.setSelectionRange === "function") try { f.setSelectionRange(caret, caret); } catch (e) {}
    }
  }
  if (state.focus) {
    const f = document.querySelector(state.focus);
    if (f) f.focus();
    state.focus = null;
  }
}

function card(o) {
  return h("section", { class: "card " + (o.tint || "") + " " + (o.span || "") },
    o.doodle ? doodle(o.doodle) : null,
    h("div", { class: "card-head" },
      o.icon ? h("span", { class: "ci", html: ico(o.icon, 22) }) : null,
      h("h2", { text: o.title }),
      o.extra || null,
      o.onAdd ? h("button", { class: "icon-btn", type: "button", "aria-label": o.title + " ekle", html: ico("plus"), onclick: o.onAdd }) : null
    ),
    ...(o.body || []),
    o.more ? h("button", { class: "more", type: "button", text: o.more[0], onclick: () => go(o.more[1]) }) : null
  );
}

const AUD_OPTS = [["private", "Kişisel", "lock"], ["public", "Herkese açık", "users"], ["some", "Kişi seç", "heart"]];
const nameOfUid = u => (allProfiles.find(p => p.uid === u) || {}).name || "?";
function audSummary(a) {
  if (a.vis === "public") return "Tüm profiller görebilir.";
  if (a.vis !== "some") return "Sadece sen görürsün.";
  const names = a.people.map(nameOfUid);
  if (a.mode === "except") return names.length ? names.join(", ") + " hariç herkes görebilir." : "Hariç tutmak istediğin kişileri seç.";
  return names.length ? "Sen ve " + names.join(", ") + " görebilir." : "Görmesini istediğin kişileri seç.";
}

function audPicker(cur, onChange, label) {
  const wrap = h("div", { class: "aud" });
  const others = allProfiles.filter(p => p.uid !== me.uid && !p.disabled);
  const draw = () => {
    const seg = (opts, val, set) => h("div", { class: "vis", role: "group", "aria-label": label || "Kimler görsün" }, opts.map(([v, l, ic]) =>
      h("button", { type: "button", "aria-pressed": v === val ? "true" : "false", onclick: () => { set(v); draw(); onChange(cur); } },
        ic ? h("span", { html: ico(ic, 14), style: "display:grid" }) : null, l)));
    wrap.replaceChildren(...[
      seg(AUD_OPTS, cur.vis, v => { cur.vis = v; }),
      cur.vis === "some" ? h("div", { class: "aud-some" },
        seg([["only", "Sadece seçtiklerim"], ["except", "Herkes, seçtiklerim hariç"]], cur.mode, v => { if (cur.mode !== v) cur.people = []; cur.mode = v; }),
        others.length ? h("div", { class: "aud-people" }, others.map(p => {
          const on = cur.people.includes(p.uid);
          return h("button", { type: "button", class: "person" + (on ? (cur.mode === "except" ? " off" : " on") : ""), "aria-pressed": on ? "true" : "false",
            onclick: () => { cur.people = on ? cur.people.filter(u => u !== p.uid) : cur.people.concat(p.uid); draw(); onChange(cur); } },
            avatar(p), h("span", { text: p.name }));
        })) : h("p", { class: "empty", text: "Henüz başka profil yok." })
      ) : null,
      h("p", { class: "aud-sum", text: audSummary(cur) })
    ].filter(Boolean));
  };
  draw();
  return wrap;
}
const visPicker = kind => audPicker(audState(kind), c => { state.aud[kind] = c; }, "Bunu kimler görsün");
const itemVis = it => audPicker(audOf(it), c => updItem(it, audFields(c)), "Bunu kimler görsün");

function audDialog(it) {
  return new Promise(resolve => {
    const root = $("dialog");
    const cur = audOf(it);
    const close = v => {
      root.classList.remove("show");
      document.removeEventListener("keydown", onKey, true);
      setTimeout(() => { root.hidden = true; root.replaceChildren(); }, 160);
      resolve(v);
    };
    const onKey = e => { if (e.key === "Escape") { e.preventDefault(); close(false); } };
    root.replaceChildren(
      h("div", { class: "dlg-back", onclick: () => close(false) }),
      h("div", { class: "dlg dlg-wide", role: "dialog", "aria-modal": "true", "aria-labelledby": "audTitle" },
        h("span", { class: "dlg-ic", html: ico("users", 26) }),
        h("h2", { id: "audTitle", text: "Kimler görsün?" }),
        h("p", { class: "clip", text: it.title || it.text || it.name || "" }),
        audPicker(cur, () => {}),
        h("div", { class: "dlg-actions" },
          h("button", { class: "btn", type: "button", text: "Vazgeç", onclick: () => close(false) }),
          h("button", { class: "btn primary", type: "button", text: "Kaydet", onclick: () => { updItem(it, audFields(cur)); close(true); } }))
      )
    );
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add("show"));
    document.addEventListener("keydown", onKey, true);
  });
}

function whoTag(it) {
  const tag = (text, title, cls) => h("span", { class: "who" + (cls ? " " + cls : ""), title }, h("span", { html: ico("users", 12), style: "display:grid" }), text);
  if (!isMine(it)) return tag(it.ownerName, it.ownerName + " paylaştı");
  if (it.vis === "public") return tag("Herkese açık", "Tüm profiller görebilir", "mine");
  if (it.vis === "some") {
    const a = audOf(it);
    const names = a.people.map(nameOfUid);
    if (a.mode === "except") return tag(names.length ? names.length + " kişi hariç" : "Herkes", audSummary(a), "mine");
    if (!names.length) return null;
    return tag(names.length <= 2 ? names.join(", ") : names.length + " kişi", audSummary(a), "mine");
  }
  return null;
}
function visBtn(it) {
  if (!isMine(it)) return null;
  const ic = it.vis === "public" ? "users" : it.vis === "some" ? "heart" : "lock";
  return h("button", { class: "icon-btn sm", type: "button", title: "Kimler görsün", "aria-label": "Kimler görsün", html: ico(ic, 16), onclick: () => audDialog(it) });
}
function delBtn(it, label, ask) {
  if (!canDel(it)) return null;
  return h("button", { class: "icon-btn sm", type: "button", "aria-label": (label || "") + " sil", html: ico("trash", 16), onclick: () => delItem(it, ask) });
}

function checklist(items, o) {
  if (!items.length) return h("p", { class: "empty", text: o.empty });
  return h("ul", { class: "checks" }, items.map(it =>
    h("li", { class: it.done ? "done" : "" },
      h("label", {},
        h("input", { type: "checkbox", checked: !!it.done, onchange: e => { updItem(it, { done: e.target.checked }); if (e.target.checked && it.kind === "plan") petAward("gorev", 5); } }),
        h("span", { text: it.text })
      ),
      whoTag(it), visBtn(it), delBtn(it, it.text)
    )
  ));
}

function addForm(key, placeholder, kind, onAdd) {
  return h("div", { class: "add-wrap" },
    h("form", {
      class: "add", "data-add": key,
      onsubmit: e => {
        e.preventDefault();
        const input = e.target.elements.t;
        const v = input.value.trim();
        if (!v) return;
        onAdd(v, getVis(kind));
        input.value = "";
        input.focus();
      }
    },
      h("input", { name: "t", id: "add-" + key, type: "text", placeholder, "aria-label": placeholder, autocomplete: "off" }),
      h("button", { class: "icon-btn", type: "submit", "aria-label": "Ekle", html: ico("plus") })
    ),
    visPicker(kind)
  );
}
const focusAdd = key => () => { const i = $("add-" + key); if (i) i.focus(); };
const pageHead = (title, hint) => h("div", { class: "page-head" }, h("h2", { text: title }), hint ? h("p", { text: hint }) : null);

function streakOf(hb) {
  const done = doneOf(hb);
  let d = today;
  if (!done[keyOf(d)]) d = addDays(d, -1);
  let n = 0;
  while (done[keyOf(d)]) { n++; d = addDays(d, -1); }
  return n;
}

function monthGrid(big) {
  const m = state.calMonth;
  const shift = delta => () => { state.calMonth = new Date(m.getFullYear(), m.getMonth() + delta, 1); render(); };
  const cells = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map(w => h("div", { class: "wd", text: w }));
  const offset = (m.getDay() + 6) % 7;
  for (let i = 0; i < offset; i++) cells.push(h("div"));
  const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const withPlans = new Set(listOf("plan").map(p => p.date));
  for (let d = 1; d <= days; d++) {
    const date = new Date(m.getFullYear(), m.getMonth(), d);
    const k = keyOf(date);
    const cls = ["cal-day"];
    if (k === todayKey) cls.push("today");
    if (big && k === state.sel) cls.push("sel");
    if (withPlans.has(k)) cls.push("dot");
    cells.push(h("button", {
      type: "button", class: cls.join(" "), text: String(d), "aria-label": fmtLong.format(date),
      onclick: () => big ? (state.sel = k, render()) : go("calendar", { sel: k })
    }));
  }
  return h("div", { class: big ? "cal cal-big" : "cal" },
    h("div", { class: "cal-head" },
      h("button", { class: "icon-btn", type: "button", "aria-label": "Önceki ay", html: ico("left", 18), onclick: shift(-1) }),
      h("h3", { text: fmtMonth.format(m) }),
      h("button", { class: "icon-btn", type: "button", "aria-label": "Sonraki ay", html: ico("right", 18), onclick: shift(1) })
    ),
    h("div", { class: "cal-grid" }, cells)
  );
}


function moodPicker(k) {
  const j = journalOf(k);
  const cur = j ? j.mood : "";
  return h("div", { class: "moods" }, MOODS.map(([m, e]) =>
    h("button", {
      type: "button", "aria-pressed": cur === m ? "true" : "false", text: e + " " + m,
      onclick: () => { const it = ensureJournal(k); updItem(it, { mood: it.mood === m ? "" : m }); render(); }
    })
  ));
}
