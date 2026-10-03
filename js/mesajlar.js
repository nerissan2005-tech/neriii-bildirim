const allMessages = () => {
  const m = new Map();
  msgsIn.concat(msgsOut).forEach(x => m.set(x.id, x));
  return [...m.values()].filter(x => !(x.hidden || []).includes(me.uid)).sort((a, b) => a.at - b.at);
};
const unreadCount = () => msgsIn.filter(x => !x.read && !x.unsent && !(x.hidden || []).includes(me.uid)).length;
const initial = n => (n || "?").trim().charAt(0).toLocaleUpperCase("tr");
const markedRead = new Set();
const profileOf = uid => allProfiles.find(p => p.uid === uid);
function avatar(p, cls) {
  const photo = p && p.photo;
  return h("span", { class: "pav" + (cls ? " " + cls : "") + (photo ? " has-photo" : "") + frameCls(p && p.frame), style: photo ? "background-image:url(\"" + photo + "\")" : null, text: photo ? "" : initial(p && p.name), "aria-hidden": "true" });
}

const EMOJIS = {
  "Yüzler": "😀 😁 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😜 🤗 🤭 🤔 😌 😴 🥺 😢 😭 😤 😡 🤯 😳 🥳 😎 🤓 😅 🙃 😬 🤩",
  "Kalpler": "❤️ 🧡 💛 💚 💙 💜 🤎 🖤 🤍 💖 💗 💓 💞 💕 💘 💝 💟 ❣️ 💔 ❤️‍🔥 💌 💋 🫶 🥂",
  "Eller": "👍 👎 👏 🙌 🙏 🤝 👋 ✌️ 🤞 🤟 👌 💪 ✍️ 🫂 👀 💅",
  "Doğa": "🌸 🌷 🌹 🌺 🌻 🌼 🍀 🌿 🌱 🌙 ⭐ 🌟 ✨ ☀️ 🌈 ☁️ 🌧️ ❄️ 🔥 🌊 🦋 🐱 🐶 🐰 🐻 🐼 🦊 🐝",
  "Yiyecek": "☕ 🍵 🧋 🍰 🎂 🍫 🍪 🍩 🍓 🍒 🍉 🍑 🍕 🍔 🍟 🥗 🍝 🍣 🥐 🍯",
  "Etkinlik": "🎉 🎊 🎁 🎈 🎀 🏆 🎯 📚 ✏️ 💻 🎧 🎵 🎬 ✈️ 🏖️ 🧘 🏃 🛍️ 💐 🕯️"
};
const STICKERS = [
  ["love", "❤️", "beat", "Kalp"], ["hug", "🤗", "wiggle", "Sarılma"], ["kiss", "😘", "beat", "Öpücük"], ["lol", "😂", "shake", "Kahkaha"],
  ["party", "🥳", "bounce", "Kutlama"], ["confetti", "🎉", "pop", "Konfeti"], ["sun", "🌞", "spin", "Günaydın"], ["moon", "🌙", "float", "İyi geceler"],
  ["flower", "🌸", "float", "Çiçek"], ["strong", "💪", "bounce", "Güçlüsün"], ["sparkle", "✨", "twinkle", "Pırıltı"], ["fire", "🔥", "flicker", "Harika"],
  ["cry", "🥺", "wiggle", "Özledim"], ["sleep", "😴", "float", "Uykulu"], ["letter", "💌", "wiggle", "Mektup"], ["clap", "👏", "shake", "Alkış"]
];
const stickerOf = k => STICKERS.find(s => s[0] === k);
const msgPreview = m => m.unsent ? "Mesaj geri çekildi" : m.sticker ? (stickerOf(m.sticker) || ["", "✨"])[1] + " çıkartma" : m.photo ? "📷 Fotoğraf" + (m.text ? ": " + m.text : "") : m.audio ? "🎤 Sesli mesaj" : m.text;
const fmtDur = s => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

async function sendQuickMessage(to, fields) {
  const p = profileOf(to);
  const ref = await db.collection("messages").add(Object.assign({ from: me.uid, fromName: me.name, to, toName: p ? p.name : "", text: "", at: Date.now(), read: false, hidden: [] }, fields));
  pushApi("/notify-message", { id: ref.id }).catch(() => {});
  return ref;
}

let recorder = null;
function pickAudioType() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]) { try { if (MediaRecorder.isTypeSupported(t)) return t; } catch (e) {} }
  return "";
}
async function startRecording(onDone) {
  const type = pickAudioType();
  if (type === null || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { showToast("Ses kaydı desteklenmiyor", "Bu tarayıcı ses kaydını desteklemiyor."); return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { showToast("Mikrofona izin verilmedi", "Sesli mesaj için mikrofon iznini açman gerekiyor."); return; }
  const opts = { audioBitsPerSecond: 24000 };
  if (type) opts.mimeType = type;
  let mr;
  try { mr = new MediaRecorder(stream, opts); } catch (e) { mr = new MediaRecorder(stream); }
  const chunks = [];
  const start = Date.now();
  recorder = { mr, stream, start, send: false, timer: null };
  mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.onstop = () => {
    stream.getTracks().forEach(t => t.stop());
    const rec = recorder;
    recorder = null;
    clearInterval(rec.timer);
    const dur = (Date.now() - start) / 1000;
    if (rec.send && dur >= 1 && chunks.length) {
      const blob = new Blob(chunks, { type: mr.mimeType || type || "audio/webm" });
      const fr = new FileReader();
      fr.onload = () => {
        if (fr.result.length > 950000) { showToast("Sesli mesaj çok uzun", "En fazla 2 dakikalık sesli mesaj gönderebilirsin."); return; }
        onDone({ audio: fr.result, dur: Math.round(dur) });
      };
      fr.readAsDataURL(blob);
    }
    render();
  };
  mr.start();
  recorder.timer = setInterval(() => {
    const el = $("recTime");
    const s = (Date.now() - start) / 1000;
    if (el) el.textContent = fmtDur(s);
    if (s >= 120) stopRecording(true);
  }, 250);
  render();
}
function stopRecording(send) {
  if (!recorder) return;
  recorder.send = send;
  try { recorder.mr.stop(); } catch (e) {}
}

function insertAtCaret(el, text) {
  const focused = document.activeElement === el;
  const s = focused && el.selectionStart != null ? el.selectionStart : el.value.length;
  const e = focused && el.selectionEnd != null ? el.selectionEnd : el.value.length;
  el.value = el.value.slice(0, s) + text + el.value.slice(e);
  const pos = s + text.length;
  el.focus();
  try { el.setSelectionRange(pos, pos); } catch (ex) {}
  state.msgDraft = el.value;
}

const REACTIONS = ["❤️", "😂", "😮", "😢", "👍", "🙏"];
function toggleReaction(m, emoji) {
  const F = firebase.firestore;
  const cur = (m.reactions || {})[me.uid];
  state.msgMenu = null;
  db.collection("messages").doc(m.id).update(new F.FieldPath("reactions", me.uid), cur === emoji ? F.FieldValue.delete() : emoji)
    .catch(() => showToast("Tepki eklenemedi", "İnternet bağlantını kontrol et."));
  render();
}

function seenText(p) {
  if (!p || !p.lastSeen) return "";
  const diff = Date.now() - p.lastSeen;
  if (diff < 2.5 * 60000) return "Çevrimiçi";
  const d = new Date(p.lastSeen);
  const k = keyOf(d);
  if (k === todayKey) return "Son görülme bugün " + fmtTime.format(d);
  if (k === keyOf(addDays(today, -1))) return "Son görülme dün " + fmtTime.format(d);
  return "Son görülme " + fmtShort.format(d) + " " + fmtTime.format(d);
}
const isOnline = p => !!(p && p.lastSeen && Date.now() - p.lastSeen < 2.5 * 60000);
const isTypingTo = p => !!(p && p.typingTo === me.uid && Date.now() - (p.typingAt || 0) < 6000);

function bubbleNode(m, opts) {
  const mine = m.from === me.uid;
  const d = new Date(m.at);
  const menuOpen = state.msgMenu === m.id;
  const content = m.unsent
    ? h("span", { class: "unsent", text: mine && !opts.admin ? "Bu mesajı geri çektin" : "Bu mesaj geri çekildi" })
    : m.sticker ? (st => h("span", { class: "sticker s-" + (st ? st[2] : "float"), title: st ? st[3] : "", text: st ? st[1] : "✨" }))(stickerOf(m.sticker))
    : m.photo ? h("span", { class: "msg-media" },
        h("img", { class: "msg-photo", src: m.photo, alt: "Fotoğraf", loading: "lazy", onclick: () => openViewer([m.photo], 0) }),
        m.text ? h("span", { class: "msg-cap", text: m.text }) : null)
    : m.audio ? h("span", { class: "msg-audio" }, h("span", { html: ico("mic", 16), style: "display:grid" }),
        h("audio", { controls: true, preload: "none", src: m.audio }), m.dur ? h("small", { text: fmtDur(m.dur) }) : null)
    : document.createTextNode(m.text);
  const actions = [];
  const reacts = Object.entries(m.reactions || {});
  if (!opts.readOnly && !m.unsent) actions.push(h("div", { class: "react-row" }, REACTIONS.map(r =>
    h("button", { type: "button", "aria-label": r + " tepkisi", "aria-pressed": (m.reactions || {})[me.uid] === r ? "true" : "false", text: r, onclick: () => toggleReaction(m, r) }))));
  if (!opts.readOnly) {
    if (!m.unsent && m.text) actions.push(h("button", { type: "button", text: "Kopyala", onclick: async () => { try { await navigator.clipboard.writeText(m.text); } catch (e) {} state.msgMenu = null; render(); } }));
    if (mine && !m.unsent) actions.push(h("button", { type: "button", text: "Geri çek", onclick: async () => {
      if (!(await ask({ title: "Mesaj geri çekilsin mi?", text: "Mesaj iki taraftan da kaldırılır, yerine geri çekildiği yazar.", ok: "Geri çek", icon: "chat" }))) return;
      state.msgMenu = null;
      db.collection("messages").doc(m.id).update({ unsent: true, text: "", sticker: null, photo: null, audio: null }).catch(() => showToast("Geri çekilemedi", "İnternet bağlantını kontrol et."));
    } }));
    actions.push(h("button", { type: "button", text: "Benden sil", onclick: () => {
      state.msgMenu = null;
      db.collection("messages").doc(m.id).update({ hidden: firebase.firestore.FieldValue.arrayUnion(me.uid) }).catch(() => showToast("Silinemedi", "İnternet bağlantını kontrol et."));
    } }));
  }
  if (opts.admin) actions.push(h("button", { type: "button", class: "danger", text: "Kalıcı sil", onclick: async () => {
    if (!(await ask({ title: "Mesaj kalıcı olarak silinsin mi?", text: "İki taraftan da tamamen kaldırılır. Bu işlem geri alınamaz.", ok: "Kalıcı sil", danger: true }))) return;
    db.collection("messages").doc(m.id).delete().then(opts.after).catch(() => showToast("Silinemedi", "Firestore kurallarının güncel olduğundan emin ol."));
  } }));
  const isRight = opts.rightUid ? m.from === opts.rightUid : mine;
  return h("div", { class: "msg-line" + (isRight ? " right" : "") },
    h("div", { class: "bubble" + (isRight ? " mine" : "") + (m.sticker && !m.unsent ? " is-sticker" : "") + (reacts.length ? " has-react" : ""),
      ondblclick: opts.readOnly || m.unsent ? null : () => toggleReaction(m, "❤️") },
      content,
      h("small", { text: (opts.admin ? (m.fromName || "") + ", " : "") + fmtTime.format(d) + (mine && m.read && !m.unsent && !opts.readOnly ? ", okundu" : "") }),
      reacts.length ? h("span", { class: "reacts", title: reacts.map(([u, r]) => ((profileOf(u) || {}).name || (u === me.uid ? me.name : "")) + " " + r).join(", ") },
        [...new Set(reacts.map(x => x[1]))].join(""), reacts.length > 1 ? h("b", { text: String(reacts.length) }) : null) : null),
    actions.length ? h("button", { class: "msg-more", type: "button", "aria-label": "Mesaj seçenekleri", "aria-expanded": menuOpen ? "true" : "false", text: "⋯",
      onclick: () => { state.msgMenu = menuOpen ? null : m.id; render(); } }) : null,
    menuOpen ? h("div", { class: "msg-menu" }, actions) : null
  );
}

function threadNode(list, opts) {
  const box = h("div", { class: "thread" });
  let lastDay = "";
  if (!list.length) box.append(h("p", { class: "empty", style: "align-self:center;margin:auto", text: opts.empty || "Henüz mesaj yok." }));
  list.forEach(m => {
    const d = new Date(m.at);
    const dk = keyOf(d);
    if (dk !== lastDay) { lastDay = dk; box.append(h("div", { class: "day-sep", text: dk === todayKey ? "Bugün" : fmtDate.format(d) })); }
    box.append(bubbleNode(m, opts));
  });
  setTimeout(() => { if (!opts.keepScroll) box.scrollTop = box.scrollHeight; });
  return box;
}

async function runInBatches(list, fn) {
  for (let i = 0; i < list.length; i += 400) {
    const batch = db.batch();
    list.slice(i, i + 400).forEach(m => fn(batch, db.collection("messages").doc(m.id)));
    await batch.commit();
  }
}

async function clearChat(thread, other, forAll) {
  state.chatMenu = false;
  const ok = await ask(forAll
    ? { title: other.name + " ile sohbet herkes için silinsin mi?", text: thread.length + " mesaj iki taraftan da kalıcı olarak silinir. Bu işlem geri alınamaz.", ok: "Kalıcı sil", danger: true }
    : { title: other.name + " ile sohbet temizlensin mi?", text: thread.length + " mesaj senin ekranından kalkar. Karşı taraf mesajları görmeye devam eder.", ok: "Temizle", danger: true });
  if (!ok) { render(); return; }
  try {
    if (forAll) await runInBatches(thread, (b, ref) => b.delete(ref));
    else await runInBatches(thread, (b, ref) => b.update(ref, { hidden: firebase.firestore.FieldValue.arrayUnion(me.uid) }));
    state.chatWith = null;
    showToast(forAll ? "Sohbet herkes için silindi" : "Sohbet temizlendi");
  } catch (e) { showToast("Sohbet temizlenemedi", "İnternet bağlantını kontrol edip tekrar dene."); }
  render();
}

async function unsendAll(mine, other) {
  state.chatMenu = false;
  if (!(await ask({ title: "Gönderdiğin mesajlar geri çekilsin mi?", text: other.name + " ile sohbette gönderdiğin " + mine.length + " mesaj iki taraftan da geri çekilir.", ok: "Geri çek", danger: true, icon: "chat" }))) { render(); return; }
  try {
    await runInBatches(mine, (b, ref) => b.update(ref, { unsent: true, text: "", sticker: null, photo: null, audio: null }));
    showToast("Mesajların geri çekildi");
  } catch (e) { showToast("Geri çekilemedi", "İnternet bağlantını kontrol edip tekrar dene."); }
  render();
}

let typingTimer = null;
let typingSentAt = 0, typingState = "";
function sendTyping(to, on) {
  const now = Date.now();
  if (on) {
    if (typingState === to && now - typingSentAt < 2500) return;
    typingState = to; typingSentAt = now;
    db.collection("profiles").doc(me.uid).update({ typingTo: to, typingAt: now }).catch(() => {});
  } else if (typingState) {
    typingState = ""; typingSentAt = 0;
    db.collection("profiles").doc(me.uid).update({ typingTo: "", typingAt: 0 }).catch(() => {});
  }
}

function renderMessages() {
  const all = allMessages();
  const withUser = uid => all.filter(m => (m.from === uid && m.to === me.uid) || (m.from === me.uid && m.to === uid));
  const unreadFrom = uid => msgsIn.filter(m => m.from === uid && !m.read && !m.unsent && !(m.hidden || []).includes(me.uid)).length;
  const partners = new Set(all.map(m => m.from === me.uid ? m.to : m.from));
  if (state.chatWith) partners.add(state.chatWith);
  const convs = [...partners].map(uid => profileOf(uid) || { uid, name: (all.find(m => m.from === uid) || {}).fromName || (all.find(m => m.to === uid) || {}).toName || "Silinmiş profil", gone: true })
    .sort((a, b) => { const la = withUser(a.uid).slice(-1)[0], lb = withUser(b.uid).slice(-1)[0]; return (lb ? lb.at : 0) - (la ? la.at : 0); });

  if (state.chatWith && !convs.some(c => c.uid === state.chatWith)) state.chatWith = null;
  if (!state.chatWith && convs.length) {
    const firstUnread = convs.find(c => unreadFrom(c.uid));
    state.chatWith = (firstUnread || convs[0]).uid;
  }

  const picker = state.msgPicker ? (() => {
    const q = (state.msgPickQ || "").toLocaleLowerCase("tr");
    const opts = profiles.filter(p => !q || p.name.toLocaleLowerCase("tr").includes(q));
    return h("div", { class: "picker" },
      h("input", { class: "field", id: "pickQ", type: "search", placeholder: "Kişi ara…", value: state.msgPickQ || "", autocomplete: "off",
        oninput: e => { state.msgPickQ = e.target.value; render(); } }),
      h("div", { class: "people", style: "margin-top:.5rem" }, opts.length ? opts.map(p =>
        h("button", { type: "button", onclick: () => { state.chatWith = p.uid; state.msgPicker = false; state.msgPickQ = ""; state.focus = "#msgInput"; render(); } },
          avatar(p), h("span", { class: "meta" }, h("strong", { text: p.name }), h("span", { text: withUser(p.uid).length ? "Sohbete devam et" : "Yeni sohbet başlat" })))
      ) : h("p", { class: "empty", text: profiles.length ? "Bu isimde kimse yok." : "Henüz başka profil yok." }))
    );
  })() : null;

  const list = h("section", { class: "card t-peach" },
    h("div", { class: "card-head" }, h("h2", { text: "Sohbetler" }),
      h("button", { class: "btn primary small", type: "button", onclick: () => { state.msgPicker = !state.msgPicker; state.focus = state.msgPicker ? "#pickQ" : null; render(); } },
        state.msgPicker ? "Kapat" : "Yeni mesaj")),
    picker,
    !picker ? (convs.length ? h("div", { class: "people" }, convs.map(p => {
      const last = withUser(p.uid).slice(-1)[0];
      const un = unreadFrom(p.uid);
      return h("button", { type: "button", "aria-current": p.uid === state.chatWith ? "true" : "false", onclick: () => { state.chatWith = p.uid; state.msgMenu = null; state.chatMenu = false; state.focus = "#msgInput"; render(); } },
        avatar(p),
        h("span", { class: "meta" }, h("strong", {}, p.name, isOnline(p) ? h("i", { class: "dot-online", title: "Çevrimiçi" }) : null), h("span", { class: isTypingTo(p) ? "typing-tag" : "", text: isTypingTo(p) ? "yazıyor…" : last ? (last.from === me.uid ? "Sen: " : "") + msgPreview(last) : "Yeni sohbet" })),
        un ? h("span", { class: "unread", text: String(un) }) : null
      );
    })) : h("p", { class: "empty", text: "Henüz bir sohbetin yok. Yeni mesaj'a dokunup kime yazmak istediğini seç." })) : null
  );

  let chatCard;
  const other = convs.find(c => c.uid === state.chatWith);
  if (!other) {
    chatCard = h("section", { class: "card chat-empty" },
      h("span", { class: "big-ic", html: ico("chat", 34) }),
      h("p", { text: "Mesajlaşmak istediğin kişiyi seç." }),
      h("button", { class: "btn primary", type: "button", text: "Yeni mesaj", onclick: () => { state.msgPicker = true; state.focus = "#pickQ"; render(); } }));
  } else {
    const thread = withUser(other.uid);
    const mine = thread.filter(m => m.from === me.uid && !m.unsent);
    const toMark = thread.filter(m => m.to === me.uid && !m.read && !markedRead.has(m.id));
    if (toMark.length) {
      const batch = db.batch();
      toMark.forEach(m => { markedRead.add(m.id); batch.update(db.collection("messages").doc(m.id), { read: true }); });
      batch.commit().catch(() => toMark.forEach(m => markedRead.delete(m.id)));
    }

    const sendMsg = async (fields) => {
      try {
        petAward("mesaj", 2);
        const ref = await db.collection("messages").add(Object.assign({ from: me.uid, fromName: me.name, to: other.uid, toName: other.name, text: "", at: Date.now(), read: false, hidden: [] }, fields));
        pushApi("/notify-message", { id: ref.id }).catch(() => {});
      } catch (e) { showToast("Mesaj gönderilemedi", "İnternet bağlantını kontrol edip tekrar dene."); return false; }
      return true;
    };
    const send = async () => {
      const input = $("msgInput");
      const text = input.value.trim();
      if (!text) return;
      input.value = ""; state.msgDraft = "";
      sendTyping(other.uid, false);
      if (!(await sendMsg({ text }))) { input.value = text; state.msgDraft = text; }
    };

    const tab = state.emojiTab || "Yüzler";
    const panel = state.emojiOpen ? h("div", { class: "emoji-panel" },
      h("div", { class: "emoji-tabs" }, Object.keys(EMOJIS).concat(["Çıkartmalar"]).map(t =>
        h("button", { type: "button", "aria-pressed": t === tab ? "true" : "false", text: t, onclick: () => { state.emojiTab = t; render(); } }))),
      tab === "Çıkartmalar"
        ? h("div", { class: "sticker-grid" }, STICKERS.map(([k, em, anim, label]) =>
            h("button", { type: "button", title: label, "aria-label": label + " çıkartması gönder", onclick: async () => { state.emojiOpen = false; await sendMsg({ sticker: k }); render(); } },
              h("span", { class: "sticker s-" + anim, text: em }), h("small", { text: label }))))
        : h("div", { class: "emoji-grid" }, EMOJIS[tab].split(" ").map(em =>
            h("button", { type: "button", text: em, "aria-label": em, onmousedown: e => e.preventDefault(), onclick: () => insertAtCaret($("msgInput"), em) })))
    ) : null;

    chatCard = h("section", { class: "card" },
      h("div", { class: "thread-head" }, avatar(other), h("div", { style: "flex:1;min-width:0" }, h("strong", { text: other.name }), other.gone ? h("div", { class: "tag", text: "Bu profil artık yok" })
          : isTypingTo(other) ? h("div", { class: "tag typing-tag", text: "yazıyor…" })
          : seenText(other) ? h("div", { class: "tag" + (isOnline(other) ? " online" : ""), text: seenText(other) }) : null),
        thread.length ? h("div", { class: "chat-tools" },
          h("button", { class: "btn small", type: "button", "aria-expanded": state.chatMenu ? "true" : "false", onclick: () => { state.chatMenu = !state.chatMenu; render(); } },
            h("span", { html: ico("trash", 15), style: "display:inline-grid;vertical-align:-2px;margin-right:.35rem" }), "Sohbeti temizle"),
          state.chatMenu ? h("div", { class: "chat-menu" },
            h("button", { type: "button", onclick: () => clearChat(thread, other, false) },
              h("strong", { text: "Benden temizle" }), h("span", { text: "Mesajlar sadece senin ekranından kalkar, " + other.name + " görmeye devam eder." })),
            mine.length ? h("button", { type: "button", onclick: () => unsendAll(mine, other) },
              h("strong", { text: "Gönderdiklerimi geri çek" }), h("span", { text: "Senin gönderdiğin " + mine.length + " mesaj iki taraftan da geri çekilir." })) : null,
            me.isAdmin ? h("button", { type: "button", class: "danger", onclick: () => clearChat(thread, other, true) },
              h("strong", { text: "Herkes için kalıcı sil" }), h("span", { text: "Sohbetin tamamı iki taraftan da tamamen silinir." })) : null
          ) : null
        ) : null),
      (() => {
        const box = threadNode(thread, { empty: other.name + " ile henüz mesajın yok. İlk mesajı sen yaz ♡", keepScroll: !!state.msgMenu });
        if (isTypingTo(other)) {
          box.append(h("div", { class: "msg-line" }, h("div", { class: "bubble typing" }, h("i"), h("i"), h("i"))));
          clearTimeout(typingTimer);
          typingTimer = setTimeout(() => { if (state.view === "messages") scheduleRender(); }, 6200 - (Date.now() - (other.typingAt || 0)));
        }
        return box;
      })(),
      other.gone ? h("p", { class: "empty", text: "Bu profile artık mesaj gönderilemiyor." }) : h("div", {},
        panel,
        recorder ? h("div", { class: "composer recording" },
          h("span", { class: "rec-dot" }),
          h("span", { class: "rec-label" }, "Kaydediliyor ", h("b", { id: "recTime", text: fmtDur((Date.now() - recorder.start) / 1000) })),
          h("button", { class: "btn", type: "button", text: "İptal", onclick: () => stopRecording(false) }),
          h("button", { class: "btn primary", type: "button", "aria-label": "Sesli mesajı gönder", html: ico("send", 18), onclick: () => stopRecording(true) })
        ) :
        h("form", { class: "composer", onsubmit: e => { e.preventDefault(); send(); } },
          h("button", { class: "icon-btn emoji-btn", type: "button", "aria-label": "Emoji ve çıkartmalar", "aria-pressed": state.emojiOpen ? "true" : "false", text: "😊",
            onclick: () => { state.emojiOpen = !state.emojiOpen; render(); } }),
          h("label", { class: "icon-btn media-btn", "aria-label": "Fotoğraf gönder", title: "Fotoğraf gönder" },
            h("span", { html: ico("image", 20), style: "display:grid" }),
            h("input", { type: "file", accept: "image/*", hidden: true, onchange: async e => {
              const f = e.target.files[0];
              e.target.value = "";
              if (!f) return;
              showToast("Fotoğraf gönderiliyor…");
              try {
                let photo = await resizeImage(f, 1100, 0.72);
                if (photo.length > 900000) photo = await resizeImage(f, 800, 0.6);
                const cap = $("msgInput") ? $("msgInput").value.trim() : "";
                if (await sendMsg({ photo, text: cap }) && cap) { $("msgInput").value = ""; state.msgDraft = ""; }
                $("toast").hidden = true;
              } catch (ex) { showToast("Fotoğraf gönderilemedi", "Başka bir fotoğraf dene."); }
            } })),
          h("button", { class: "icon-btn media-btn", type: "button", "aria-label": "Sesli mesaj kaydet", title: "Sesli mesaj", html: ico("mic", 20),
            onclick: () => startRecording(fields => sendMsg(fields)) }),
          h("textarea", { id: "msgInput", class: "field", rows: "1", placeholder: other.name + " için bir mesaj yaz…", "aria-label": "Mesaj",
            oninput: e => { state.msgDraft = e.target.value; sendTyping(other.uid, !!e.target.value.trim()); },
            onblur: () => sendTyping(other.uid, false),
            onkeydown: e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } } }, state.msgDraft || ""),
          h("button", { class: "btn primary", type: "submit", "aria-label": "Gönder", html: ico("send", 18) })
        )
      )
    );
  }

  return h("div", {}, pageHead("Mesajlar", "Kime yazmak istediğini seç ve sohbete başla."), h("div", { class: "chat" }, list, chatCard));
}

async function loadAdminChats() {
  state.adminChatsLoading = true;
  try {
    const snap = await db.collection("messages").get();
    state.adminChats = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  } catch (e) { state.adminChats = null; showToast("Mesajlar yüklenemedi", "Firestore kurallarının güncel olduğundan emin ol."); }
  state.adminChatsLoading = false;
  if (state.view === "admin") render();
}

function adminChatsCard() {
  const msgs = state.adminChats;
  let body;
  if (!msgs) {
    body = [h("p", { class: "empty", text: "Profiller arasındaki tüm sohbetleri buradan görebilir, uygunsuz mesajları kalıcı olarak silebilirsin." }),
      h("button", { class: "btn primary", type: "button", style: "align-self:flex-start;margin-top:.9rem", text: state.adminChatsLoading ? "Yükleniyor…" : "Sohbetleri göster", onclick: loadAdminChats })];
  } else {
    const pairs = new Map();
    msgs.forEach(m => {
      const key = [m.from, m.to].sort().join("|");
      if (!pairs.has(key)) pairs.set(key, []);
      pairs.get(key).push(m);
    });
    const nameOf = (uid, m) => (profileOf(uid) || {}).name || (m.from === uid ? m.fromName : m.toName) || "?";
    const list = [...pairs.entries()].map(([k, arr]) => { arr.sort((a, b) => a.at - b.at); return { k, arr, last: arr[arr.length - 1] }; }).sort((a, b) => b.last.at - a.last.at);
    const sel = list.find(x => x.k === state.adminChat);
    body = [
      h("div", { class: "row", style: "justify-content:space-between;margin-bottom:.6rem" },
        h("span", { class: "tag", text: list.length + " sohbet, " + msgs.length + " mesaj" }),
        h("button", { class: "btn small", type: "button", text: "Yenile", onclick: loadAdminChats })),
      h("div", { class: "chat admin-chat" },
        h("div", { class: "people" }, list.length ? list.map(x => {
          const [a, b] = x.k.split("|");
          return h("button", { type: "button", "aria-current": x.k === state.adminChat ? "true" : "false", onclick: () => { state.adminChat = x.k; render(); } },
            h("span", { class: "meta" }, h("strong", { text: nameOf(a, x.last) + " ve " + nameOf(b, x.last) }), h("span", { text: msgPreview(x.last) })));
        }) : h("p", { class: "empty", text: "Henüz hiç mesaj yok." })),
        sel ? threadNode(sel.arr, { readOnly: true, admin: true, rightUid: sel.k.split("|")[0], after: loadAdminChats, keepScroll: false })
            : h("p", { class: "empty", style: "align-self:center", text: "Görmek istediğin sohbeti seç." })
      )
    ];
  }
  return card({ title: "Sohbetler (yönetici görünümü)", icon: "chat", span: "span-12", body });
}

let toastTimer = null;
function showToast(title, body, action, actionLabel) {
  const t = $("toast");
  t.replaceChildren(
    h("span", { class: "ti", html: ico(action ? "chat" : "bell", 20) }),
    h("div", { style: "flex:1;min-width:0" },
      h("strong", { text: title }),
      body ? h("p", { text: body }) : null,
      action ? h("button", { class: "btn primary", type: "button", style: "padding:.45rem .9rem;font-size:.85rem", text: actionLabel || "Aç", onclick: () => { t.hidden = true; action(); } }) : null
    ),
    h("button", { class: "icon-btn x", type: "button", "aria-label": "Kapat", html: ico("x", 18), onclick: () => { t.hidden = true; } })
  );
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 9000);
}
