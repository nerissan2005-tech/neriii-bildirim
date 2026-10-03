const TR_MAP = { "ı": "i", "ğ": "g", "ü": "u", "ş": "s", "ö": "o", "ç": "c" };
const slugOf = n => (n || "").toLocaleLowerCase("tr").replace(/[ığüşöç]/g, c => TR_MAP[c]).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const emailOf = n => n.includes("@") ? n.trim().toLowerCase() : slugOf(n) + "@nerii.app";
function authError(err) {
  const c = (err && err.code) || "";
  if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-login-credentials", "auth/invalid-email"].includes(c)) return "Profil adı ya da şifre hatalı.";
  if (c === "auth/email-already-in-use") return "Bu isimde bir profil zaten var.";
  if (c === "auth/weak-password") return "Şifre en az 6 karakter olmalı.";
  if (c === "auth/too-many-requests") return "Çok fazla deneme yapıldı, biraz bekleyip tekrar dene.";
  if (c === "auth/network-request-failed") return "İnternet bağlantını kontrol et.";
  if (c === "auth/operation-not-allowed" || c === "auth/admin-restricted-operation") return "Yeni profil oluşturma şu an kapalı.";
  if (c === "auth/requires-recent-login") return "Güvenlik için çıkış yapıp tekrar giriş yapman gerekiyor.";
  return "Bir sorun oluştu, tekrar dene.";
}

const FB_READY = !Object.values(firebaseConfig).some(v => !v || v === "BURAYA");
let pendingName = "";

function showLogin(message) {
  hideSplash();
  $("appRoot").hidden = true;
  $("band").hidden = true;
  const box = $("login");
  box.hidden = false;
  const err = h("p", { class: "err", role: "alert", text: message || "" });
  const form = h("form", { onsubmit: async e => {
    e.preventDefault();
    err.textContent = "";
    if (!FB_READY) { err.textContent = "Kurulum henüz tamamlanmadı."; return; }
    const name = $("lgName").value.trim(), pw = $("lgPass").value;
    if (!slugOf(name)) { err.textContent = "Profil adını ya da kullanıcı adını yaz."; return; }
    if (!pw) { err.textContent = "Şifreni yaz."; return; }
    const btn = e.target.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Giriş yapılıyor…";
    try {
      if (!name.includes("@")) pendingName = name;
      const email = await resolveEmail(name);
      if (!email) {
        err.textContent = "Bu kullanıcı adı değiştirilmiş. Yeni kullanıcı adınla giriş yap.";
        btn.disabled = false; btn.textContent = "Giriş yap";
        return;
      }
      await auth.signInWithEmailAndPassword(email, pw);
    } catch (ex) {
      err.textContent = authError(ex);
      btn.disabled = false; btn.textContent = "Giriş yap";
    }
  } },
    h("label", { class: "lbl", for: "lgName", text: "Profil adı ya da kullanıcı adı" }),
    h("input", { class: "field", id: "lgName", type: "text", autocomplete: "username", autocapitalize: "words" }),
    h("label", { class: "lbl", for: "lgPass", text: "Şifre" }),
    h("input", { class: "field", id: "lgPass", type: "password", autocomplete: "current-password" }),
    h("button", { class: "btn primary", type: "submit", text: "Giriş yap" }),
    err
  );
  box.replaceChildren(
    h("span", { html: HERO_SVG, style: "position:absolute;inset:0;display:block" }),
    h("div", { class: "login-card" },
      h("h1", { text: "Neriii ♡" }),
      h("p", { class: "sub", text: "Profilinle giriş yap" }),
      FB_READY ? form : h("p", { class: "setup", text: "Giriş sistemi için Firebase ayarlarının index.html içindeki firebaseConfig alanına eklenmesi gerekiyor." })
    )
  );
  box.querySelector("span > svg").style.cssText = "width:100%;height:100%";
  const first = $("lgName");
  if (first) first.focus();
}

async function migrateBlob(blob) {
  const rows = [];
  const base = vis => ({ owner: me.uid, ownerName: me.name, vis: vis || "private", upd: Date.now(), updName: me.name });
  (blob.notes || []).forEach(n => rows.push(Object.assign(base(), { kind: "note", title: n.title || "", body: n.body || "", at: n.updated || Date.now() })));
  (blob.goals || []).forEach(g => rows.push(Object.assign(base(), { kind: "goal", text: g.text, area: g.area || "Kişisel", progress: g.progress || 0, at: Date.now() })));
  (blob.habits || []).forEach(hb => rows.push(Object.assign(base(), { kind: "habit", name: hb.name, done: { [me.uid]: hb.done || {} }, at: Date.now() })));
  Object.entries(blob.plan || {}).forEach(([k, arr]) => (arr || []).forEach(p => rows.push(Object.assign(base(), { kind: "plan", text: p.text, date: k, done: !!p.done, at: Date.now() }))));
  (blob.shopping || []).forEach(s => rows.push(Object.assign(base(), { kind: "shop", text: s.text, done: !!s.done, at: Date.now() })));
  (blob.books || []).forEach(b => rows.push(Object.assign(base(), { kind: "book", title: b.title, author: b.author || "", status: b.status || "Okunacak", at: Date.now() })));
  (blob.myAff || []).forEach(a => rows.push(Object.assign(base(), { kind: "aff", text: a.text, cat: a.cat, date: a.date || todayKey, at: Date.now() })));
  for (let i = 0; i < rows.length; i += 400) {
    const batch = db.batch();
    rows.slice(i, i + 400).forEach(r => batch.set(itemsCol().doc(), r));
    await batch.commit();
  }
  ["notes", "goals", "habits", "plan", "shopping", "books", "myAff", "name", "recipes"].forEach(k => { delete data[k]; });
  data.v3 = true;
}

async function resolveEmail(name) {
  if (name.includes("@")) return name.trim().toLowerCase();
  const slug = slugOf(name);
  try {
    const d = await db.collection("logins").doc(slug).get();
    if (d.exists) {
      const x = d.data();
      if (x.moved) return null;
      if (x.email) return x.email;
    }
  } catch (e) {}
  return slug + "@nerii.app";
}

const isRootProfile = p => p.root === true || (me && me.isRoot && p.uid === me.uid);
const profEmail = p => p.email || (p.slug ? p.slug + "@nerii.app" : "");

async function renameProfile(p, newName) {
  newName = (newName || "").trim();
  const newSlug = slugOf(newName);
  if (!newSlug || newName.includes("@")) throw new Error("Geçerli bir kullanıcı adı yaz.");
  if (newName === p.name) return;
  const batch = db.batch();
  if (newSlug !== p.slug) {
    if (allProfiles.some(x => x.uid !== p.uid && x.slug === newSlug)) throw new Error("Bu kullanıcı adı başka bir profilde kullanılıyor.");
    const taken = await db.collection("logins").doc(newSlug).get();
    if (taken.exists && taken.data().uid !== p.uid) throw new Error("Bu kullanıcı adı daha önce alınmış.");
    batch.set(db.collection("logins").doc(newSlug), { uid: p.uid, email: profEmail(p), at: Date.now() });
    if (p.slug) batch.set(db.collection("logins").doc(p.slug), { uid: p.uid, moved: true, at: Date.now() });
  }
  batch.update(db.collection("profiles").doc(p.uid), { name: newName, slug: newSlug, email: profEmail(p) });
  await batch.commit();
}

async function startApp(user) {
  const isRoot = (user.email || "").toLowerCase() === ADMIN_EMAIL;
  const pRef = db.collection("profiles").doc(user.uid);
  const fastGet = ref => ref.get({ source: "cache" }).then(d => d.exists ? d : ref.get()).catch(() => ref.get());
  const uRef = db.collection("userdata").doc(user.uid);
  const uDocP = fastGet(uRef).catch(() => null);
  let pDoc = await fastGet(pRef);
  if (!pDoc.exists) {
    if (!isRoot) { loginNotice = "Bu profil yönetici tarafından eklenmemiş."; await auth.signOut(); return; }
    await pRef.set({ name: pendingName || "Neriii", slug: ADMIN_EMAIL.split("@")[0], role: "admin", root: true, email: ADMIN_EMAIL, at: Date.now() });
    pDoc = await pRef.get();
  }
  const p = pDoc.data();
  if (p.disabled && !isRoot) { loginNotice = "Bu profil devre dışı bırakılmış. Yöneticiyle görüş."; await auth.signOut(); return; }
  pendingName = "";
  petState = p.pet ? Object.assign({}, p.pet) : null;
  me = { uid: user.uid, name: p.name, photo: p.photo || "", frame: p.frame || "", email: user.email, isRoot, isAdmin: isRoot || p.role === "admin" };
  const fix = {};
  if (isRoot && p.root !== true) Object.assign(fix, { root: true, role: "admin" });
  if (!p.email) fix.email = user.email;
  if (Object.keys(fix).length) pRef.update(fix).catch(() => {});
  if (p.slug) {
    db.collection("logins").doc(p.slug).get().then(lg => {
      if (!lg.exists) return db.collection("logins").doc(p.slug).set({ uid: user.uid, email: user.email, at: Date.now() });
    }).catch(() => {});
  }

  let uDoc = await uDocP;
  if (!uDoc) uDoc = await uRef.get();
  if (uDoc.metadata && uDoc.metadata.fromCache) {
    uRef.get({ source: "server" }).then(fresh => {
      if (!me || !fresh.exists || saveTimer || !fresh.data().json || fresh.data().json === JSON.stringify(data)) return;
      try { data = Object.assign(defaults(), JSON.parse(fresh.data().json)); applyTheme(); scheduleRender(); } catch (e) {}
    }).catch(() => {});
  }
  const blob = uDoc.exists && uDoc.data().json ? JSON.parse(uDoc.data().json) : null;
  data = Object.assign(defaults(), blob || {});
  if (blob && !blob.v3) { await migrateBlob(blob); pushData(); }
  if (!data.j2) {
    const rows = Object.entries(data.journal || {}).filter(([k, e]) => e && ((e.text || "").trim() || e.mood || (e.gratitude || []).some(g => (g || "").trim())));
    for (let i = 0; i < rows.length; i += 400) {
      const batch = db.batch();
      rows.slice(i, i + 400).forEach(([k, e]) => batch.set(itemsCol().doc(), { kind: "journal", owner: me.uid, ownerName: me.name, vis: "private", at: Date.now(), upd: Date.now(), updName: me.name, date: k, mood: e.mood || "", gratitude: e.gratitude || ["", "", ""], text: e.text || "" }));
      await batch.commit();
    }
    data.journal = {};
    data.j2 = true;
    pushData();
  }
  else if (!blob) pushData();

  $("login").hidden = true;
  $("login").replaceChildren();
  hideSplash();
  $("appRoot").hidden = false;
  $("band").hidden = false;
  $("tabbar").hidden = false;
  refreshInstallUi();
  loadNotif();
  const paintMe = () => {
    $("logoName").textContent = me.name + " ♡";
    $("logoShort").textContent = initial(me.name) + "♡";
    const ab = document.querySelector('#nav button[data-view="admin"]');
    if (ab) ab.hidden = !me.isAdmin;
  };
  paintMe();
  applyTheme();

  const beat = () => { if (me && document.visibilityState === "visible") db.collection("profiles").doc(me.uid).update({ lastSeen: Date.now() }).catch(() => {}); };
  beat();
  presenceTimer = setInterval(beat, 60000);
  document.addEventListener("visibilitychange", beat);

  let firstIn = true;
  let profSig = "", typingSig = "", chatOnline = null;
  unsubs.push(db.collection("profiles").onSnapshot(snap => {
    allProfiles = snap.docs.map(d => Object.assign({ uid: d.id }, d.data()));
    const sig = JSON.stringify(allProfiles.map(x => [x.uid, x.name, x.photo ? x.photo.length : 0, x.role, x.disabled, x.slug]));
    const tSig = JSON.stringify(allProfiles.filter(x => x.typingTo === me.uid).map(x => [x.uid, x.typingAt]));
    const cOn = state.chatWith ? isOnline(allProfiles.find(x => x.uid === state.chatWith)) : null;
    const structural = sig !== profSig, typingChanged = tSig !== typingSig, presenceFlip = cOn !== chatOnline;
    profSig = sig; typingSig = tSig; chatOnline = cOn;
    profiles = allProfiles.filter(x => x.uid !== me.uid && !x.disabled);
    const mine = allProfiles.find(x => x.uid === me.uid);
    if (mine) {
      if (mine.disabled && !isRoot) { loginNotice = "Bu profil devre dışı bırakıldı."; logout(); return; }
      me.name = mine.name;
      me.photo = mine.photo || "";
      me.frame = mine.frame || "";
      me.isAdmin = isRoot || mine.role === "admin";
      if (!me.isAdmin && state.view === "admin") { go("home"); return; }
      paintMe();
    }
    if (structural) healExcept();
    if (structural && ["messages", "admin", "settings"].includes(state.view)) scheduleRender();
    else if (state.view === "messages" && (typingChanged || presenceFlip)) scheduleRender();
    else updateHeader();
  }, () => {}));
  unsubs.push(db.collection("messages").where("to", "==", me.uid).onSnapshot(snap => {
    msgsIn = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    if (firstIn) {
      firstIn = false;
      const un = msgsIn.filter(m => !m.read && !m.unsent && !(m.hidden || []).includes(me.uid)).sort((a, b) => b.at - a.at);
      if (un.length) {
        const names = [...new Set(un.map(m => m.fromName))];
        showToast(un.length === 1 ? un[0].fromName + " sana bir mesaj bıraktı" : "Sana " + un.length + " yeni mesaj var",
          un.length === 1 ? msgPreview(un[0]) : names.join(", ") + " sana yazdı.",
          () => go("messages", { chatWith: un[0].from }), "Mesajlara git");
      }
    } else {
      snap.docChanges().forEach(ch => {
        const m = Object.assign({ id: ch.doc.id }, ch.doc.data());
        if (ch.type === "added" && !m.read && !m.unsent && (document.visibilityState !== "visible" || !document.hasFocus())) {
          notify(m.fromName + " sana yazdı", msgPreview(m), m.id, "messages", m.from);
        }
        if (ch.type === "added" && !m.read && !m.unsent && !(state.view === "messages" && state.chatWith === m.from && document.visibilityState === "visible")) {
          showToast(m.fromName + " sana yazdı", msgPreview(m), () => go("messages", { chatWith: m.from }), "Cevap ver");
        }
      });
    }
    if (state.view === "messages") scheduleRender(); else updateHeader();
  }, () => {}));
  unsubs.push(db.collection("messages").where("from", "==", me.uid).onSnapshot(snap => {
    msgsOut = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    if (state.view === "messages") scheduleRender();
  }, () => {}));

  let firstItems = 0;
  const startItems = () => {
    const onItems = (target, setter) => snap => {
      const m = new Map();
      snap.docs.forEach(d => m.set(d.id, Object.assign({ id: d.id }, d.data())));
      setter(m);
      itemsCache = null;
      if (firstItems < 2) firstItems++;
      checkLetters();
      if (!["messages", "settings"].includes(state.view)) scheduleRender(); else updateHeader();
    };
    unsubs.push(itemsCol().where("vis", "==", "public").onSnapshot(onItems("pub", m => { pubItems = m; }), () => {}));
    unsubs.push(itemsCol().where("owner", "==", me.uid).onSnapshot(onItems("mine", m => { myItems = m; healExcept(); }), () => {}));
    unsubs.push(itemsCol().where("viewers", "array-contains", me.uid).onSnapshot(onItems("some", m => { someItems = m; }), () => {}));
  };
  startItems();
  go(location.hash.slice(1) || "home");
  setTimeout(petCarePrompt, 2200);
  unsubs.push(db.collection("config").doc("site").onSnapshot(d => {
    site = d.exists ? d.data() : {};
    if (state.view === "home") scheduleRender();
  }, () => {}));
}

let presenceTimer = null;
function healExcept() {
  if (!me || !allProfiles.length) return;
  const others = otherMembers();
  myItems.forEach(it => {
    if (it.vis !== "some" || it.mode !== "except") return;
    const want = others.filter(u => !(it.except || []).includes(u));
    const have = it.viewers || [];
    if (want.some(u => !have.includes(u))) updItem(it, { viewers: [...new Set(have.concat(want))] });
  });
}

function hideSplash() {
  const s = $("splash");
  if (!s || s.classList.contains("out")) return;
  s.classList.add("out");
  setTimeout(() => s.remove(), 350);
}

function logout() {
  clearInterval(presenceTimer);
  if (me && db) db.collection("profiles").doc(me.uid).update({ lastSeen: Date.now() - 3 * 60000, typingTo: "", typingAt: 0 }).catch(() => {});
  lockAdmin();
  if (saveTimer) pushData();
  flushItems();
  unsubs.forEach(u => u());
  unsubs = [];
  const dropPush = async () => {
    let had = false;
    try { had = !!localStorage.getItem("neriii-push-id"); } catch (e) {}
    await unregisterPush();
    if (had) { try { localStorage.setItem("neriii-push-id", "local"); } catch (e) {} }
  };
  setTimeout(() => {
    Promise.race([dropPush(), new Promise(r => setTimeout(r, 2500))]).catch(() => {}).then(() =>
      auth.signOut().then(() => { history.replaceState(null, "", location.pathname); location.reload(); }));
  }, 300);
}

const RENDER = { home: renderHome, letters: renderLetters, notes: () => withTabs(renderNotes(), TABS_NOTES), goals: () => withTabs(renderGoals(), TABS_NOTES), habits: () => withTabs(renderHabits(), TABS_CAL), calendar: () => withTabs(renderCalendar(), TABS_CAL), journal: renderJournal, affirm: renderAffirm, messages: renderMessages, shopping: renderShopping, prayers: renderPrayers, pet: renderPet, memories: renderMemories, magic: renderMagic, settings: renderSettings, admin: renderAdmin };


function greeting() {
  const hr = new Date().getHours();
  if (hr >= 5 && hr < 12) return "Günaydın";
  if (hr >= 12 && hr < 18) return "İyi günler";
  if (hr >= 18 && hr < 22) return "İyi akşamlar";
  return "İyi geceler";
}


function updateHeader() {
  if (!me) return;
  const unread = unreadCount();
  $("greetTitle").textContent = greeting() + " " + me.name + " ♡";
  const p = plansOn(todayKey);
  const done = p.filter(i => i.done).length;
  const left = p.length - done;
  $("greetSub").textContent = unread ? "Sana " + unread + " yeni mesaj var ♡"
    : !p.length ? "Bugün harika şeyler başarabilirsin."
    : !left ? "Bugünkü planının hepsini tamamladın, tebrikler."
    : "Bugün planında " + p.length + " iş var, " + done + " tanesi tamam.";
  const now = new Date();
  $("clockDate").textContent = fmtDate.format(now);
  $("clockTime").textContent = fmtTime.format(now);
  const total = unread + left;
  $("bellBtn").innerHTML = ico("bell", 22) + (total ? '<span class="badge">' + total + "</span>" : "");
  $("bellBtn").setAttribute("aria-label", unread ? unread + " okunmamış mesaj" : left ? "Bugün " + left + " iş kaldı" : "Bildirimler");
  const ab = $("avatarBtn");
  ab.textContent = me.photo ? "" : initial(me.name);
  ab.style.backgroundImage = me.photo ? "url(\"" + me.photo + "\")" : "";
  ab.classList.toggle("has-photo", !!me.photo);
  ab.className = "avatar" + (me.photo ? " has-photo" : "") + frameCls(me.frame);
  document.title = unread ? "(" + unread + ") Neriii" : "Neriii";
  const tb = document.querySelector('#tabbar button[data-view="messages"] .ti-ic');
  if (tb) { const old = tb.querySelector(".badge"); if (old) old.remove(); if (unread) tb.append(h("span", { class: "badge", text: String(unread) })); }
  const mBtn = document.querySelector('#nav button[data-view="messages"] .lbl');
  if (mBtn) mBtn.textContent = unread ? "Mesajlar (" + unread + ")" : "Mesajlar";
}

function tick() {
  if (!me) return;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (now.getTime() !== today.getTime()) {
    today = now; todayKey = keyOf(today); state.calMonth = firstOfMonth(today);
    if (state.view === "home") scheduleRender();
  }
  updateHeader();
}

function searchAll(q) {
  q = q.toLocaleLowerCase("tr");
  const has = s => s && String(s).toLocaleLowerCase("tr").includes(q);
  const out = [];
  allItems().forEach(i => {
    if (i.kind === "note" && (has(i.title) || has(i.body))) out.push([i.title || "Başlıksız not", "Not", () => go("notes", { noteId: i.id })]);
    if (i.kind === "goal" && has(i.text)) out.push([i.text, "Hedef", () => go("goals")]);
    if (i.kind === "habit" && has(i.name)) out.push([i.name, "Alışkanlık", () => go("habits")]);
    if (i.kind === "plan" && has(i.text)) out.push([i.text, "Plan, " + fmtShort.format(fromKey(i.date)), () => go("calendar", { sel: i.date, calMonth: firstOfMonth(fromKey(i.date)) })]);
    if (i.kind === "shop" && has(i.text)) out.push([i.text, "Alışveriş listesi", () => go("shopping", { shopTab: "shop" })]);
    if (i.kind === "payment" && has(i.text)) out.push([i.text, "Ödeme", () => go("shopping", { shopTab: "pay" })]);
    if (i.kind === "prayer" && (has(i.title) || has(i.text))) out.push([i.title || "Dua", "Dua, " + (i.cat || ""), () => go("prayers", { prayerOpen: i.id })]);
    if (i.kind === "journal" && (has(i.text) || (i.gratitude || []).some(has))) out.push([fmtDate.format(fromKey(i.date)) + (isMine(i) ? "" : ", " + i.ownerName), "Günlük", () => go("journal", isMine(i) ? { jDate: i.date, jOther: null } : { jOther: i.id })]);
    if (i.kind === "memory" && (has(i.title) || has(i.text) || has(i.place))) out.push([i.title || "Anı", "Anı, " + fmtShort.format(fromKey(i.date || todayKey)), () => { go("memories"); setTimeout(() => memoryDialog(i), 250); }]);
    if (i.kind === "aff" && has(i.text)) out.push([i.text, "Olumlama", () => go("affirm", { affFilter: "Eklenenler" })]);
  });
  BUILTIN_PRAYERS.forEach(p => { if (has(p.title) || p.lines.some(has) || has(p.meal)) out.push([p.title, p.sub, () => go("prayers")]); });
  const dAll = affDay();
  for (let i = dAll; i >= 0; i--) { const x = affAt(i); if (has(x.text)) out.push([x.text, "Olumlama, " + x.cat, () => go("affirm", { affFilter: x.cat })]); }

  return out.slice(0, 8);
}


const searchIn = $("search");
const resultsEl = $("results");
searchIn.addEventListener("input", () => {
  const q = searchIn.value.trim();
  if (q.length < 2) { resultsEl.hidden = true; return; }
  const res = searchAll(q);
  resultsEl.replaceChildren(...(res.length
    ? res.map(([label, kind, fn]) => h("li", {}, h("button", { type: "button", onclick: () => { searchIn.value = ""; resultsEl.hidden = true; fn(); } }, label, h("small", { text: kind }))))
    : [h("li", { class: "empty", style: "padding:.5rem .7rem", text: "Sonuç bulunamadı." })]));
  resultsEl.hidden = false;
});
document.addEventListener("click", e => { if (!e.target.closest(".search")) resultsEl.hidden = true; });
searchIn.addEventListener("keydown", e => { if (e.key === "Escape") { searchIn.value = ""; resultsEl.hidden = true; } });

$("gsun").innerHTML = ico("sun", 44);
$("searchIco").innerHTML = ico("search", 18);
$("installBtn").innerHTML = ico("download", 20) + '<span>İndir</span>';
$("installBtn").addEventListener("click", installApp);
$("bellBtn").addEventListener("click", () => {
  const un = msgsIn.filter(m => !m.read).sort((a, b) => b.at - a.at);
  if (un.length) go("messages", { chatWith: un[0].from });
  else go("calendar", { sel: todayKey, calMonth: firstOfMonth(today) });
});
$("avatarBtn").addEventListener("click", () => go("settings"));


let swReg = null;
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").then(r => { swReg = r; }).catch(() => {});
  navigator.serviceWorker.addEventListener("message", e => {
    const d = e.data || {};
    if (d.type === "open" && me) go(d.view || "home", d.chatWith ? { chatWith: d.chatWith } : {});
  });
}
let pushActive = false;
let notifSettings = {};
const notifRef = () => db.collection("userdata").doc(me.uid).collection("notify").doc("settings");

async function pushApi(path, body) {
  if (!PUSH_API || !auth || !auth.currentUser) return null;
  const token = await auth.currentUser.getIdToken();
  const res = await fetch(PUSH_API.replace(/\/+$/, "") + path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify(body || {}) });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function saveNotif(patch) {
  notifSettings = Object.assign({}, notifSettings, patch, { tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul" });
  await notifRef().set(notifSettings, { merge: true });
}

let messagingLoad = null;
function loadMessaging() {
  if (typeof firebase.messaging === "function") return Promise.resolve(true);
  if (!messagingLoad) messagingLoad = new Promise(resolve => {
    const s = document.createElement("script");
    s.src = "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js";
    s.onload = () => resolve(true);
    s.onerror = () => { messagingLoad = null; resolve(false); };
    document.head.append(s);
  });
  return messagingLoad;
}

async function registerPush(ask) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  const perm = ask ? await Notification.requestPermission() : Notification.permission;
  if (perm !== "granted") return perm;
  let supported = false;
  try { supported = (await loadMessaging()) && await firebase.messaging.isSupported(); } catch (e) {}
  if (!supported) { try { localStorage.setItem("neriii-push-id", "local"); } catch (e) {} return "local"; }
  const reg = await navigator.serviceWorker.ready;
  const token = await firebase.messaging().getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  if (!token) return "error";
  const id = (await sha256(token)).slice(0, 40);
  await db.collection("userdata").doc(me.uid).collection("tokens").doc(id).set({ token, at: Date.now(), ua: navigator.userAgent.slice(0, 120) });
  try { localStorage.setItem("neriii-push-id", id); } catch (e) {}
  pushActive = true;
  return "ok";
}

async function unregisterPush() {
  let id = null;
  try { id = localStorage.getItem("neriii-push-id"); localStorage.removeItem("neriii-push-id"); } catch (e) {}
  if (id && id !== "local") await db.collection("userdata").doc(me.uid).collection("tokens").doc(id).delete().catch(() => {});
  try { if (await loadMessaging()) await firebase.messaging().deleteToken(); } catch (e) {}
  pushActive = false;
}

async function loadNotif() {
  try { const d = await notifRef().get(); notifSettings = d.exists ? d.data() : {}; } catch (e) { notifSettings = {}; }
  let id = null;
  try { id = localStorage.getItem("neriii-push-id"); } catch (e) {}
  if (id && "Notification" in window && Notification.permission === "granted") setTimeout(() => registerPush(false).catch(() => {}), 2500);
  if (state.view === "settings") scheduleRender();
}

function notify(title, body, tag, view, chatWith) {
  if (pushActive && PUSH_API && tag !== "test") return;
  if (!("Notification" in window) || Notification.permission !== "granted" || data.notify === false) return;
  const opts = { body, icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: tag || "neriii", data: { view: view || "home", chatWith: chatWith || null } };
  if (swReg && swReg.showNotification) { swReg.showNotification(title, opts).catch(() => {}); return; }
  try {
    const n = new Notification(title, opts);
    n.onclick = () => { window.focus(); if (view) go(view, chatWith ? { chatWith } : {}); n.close(); };
  } catch (e) {}
}

function openSheet() {
  const sh = $("sheet");
  const close = () => { sh.classList.remove("show"); setTimeout(() => { sh.hidden = true; sh.replaceChildren(); }, 200); };
  const items = VIEWS.filter(([v]) => !TAB_MAIN.includes(v) && !NAV_HIDE.includes(v) && (v !== "admin" || (me && me.isAdmin)));
  sh.replaceChildren(
    h("div", { class: "sheet-back", onclick: close }),
    h("div", { class: "sheet-panel", role: "dialog", "aria-modal": "true", "aria-label": "Diğer bölümler" },
      h("div", { class: "sheet-grab" }),
      h("div", { class: "sheet-grid" },
        items.map(([v, label, icon]) => h("button", { type: "button", "aria-current": state.view === v ? "page" : null, onclick: () => { close(); go(v); } },
          h("span", { class: "sheet-ic", html: ico(icon, 22) }), h("span", { text: label }))),
        platformInfo().standalone ? null : h("button", { type: "button", class: "dl", onclick: () => { close(); installApp(); } },
          h("span", { class: "sheet-ic", html: ico("download", 22) }), h("span", { text: "Uygulamayı indir" })),
        h("button", { type: "button", class: "out", onclick: () => { close(); logout(); } },
          h("span", { class: "sheet-ic", html: ico("logout", 22) }), h("span", { text: "Çıkış yap" }))
      )
    )
  );
  sh.hidden = false;
  requestAnimationFrame(() => sh.classList.add("show"));
}

$("tabbar").append(...TAB_MAIN.map(v => {
  const [, label, icon] = VIEWS.find(x => x[0] === v);
  return h("button", { type: "button", "data-view": v, onclick: () => go(v) }, h("span", { class: "ti-ic", html: ico(icon, 22) }), h("span", { class: "ti-l", text: v === "affirm" ? "Olumlama" : v === "home" ? "Ana Sayfa" : label }));
}), h("button", { type: "button", "data-view": "more", onclick: openSheet }, h("span", { class: "ti-ic", html: ico("menu", 22) }), h("span", { class: "ti-l", text: "Daha fazla" })));

$("nav").append(...VIEWS.filter(([v]) => !NAV_HIDE.includes(v)).map(([v, label, icon]) =>
  h("button", { type: "button", "data-view": v, title: label, hidden: v === "admin", onclick: () => go(v) }, h("span", { html: ico(icon, 21), style: "display:grid" }), h("span", { class: "lbl", text: label }))
));
$("nav").append(h("button", { type: "button", class: "logout", title: "Çıkış yap", onclick: logout }, h("span", { html: ico("logout", 21), style: "display:grid" }), h("span", { class: "lbl", text: "Çıkış yap" })));

window.addEventListener("hashchange", () => { if (!me) return; const v = location.hash.slice(1); if (v !== state.view) go(v); });
setInterval(tick, 20000);

applyTheme();

if (!FB_READY || typeof firebase === "undefined") {
  showLogin();
} else {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  db = firebase.firestore();
  try { db.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}
  auth.onAuthStateChanged(user => {
    if (user) startApp(user).catch(() => { loginNotice = "Veriler yüklenemedi. Firestore kurallarını ve internet bağlantını kontrol edip tekrar dene."; auth.signOut(); });
    else { me = null; showLogin(loginNotice); loginNotice = ""; }
  });
}
