const LETTER_PAPERS = [["#FFE3EC", "Pembe"], ["#EFE6FF", "Lila"], ["#E3F1FF", "Mavi"], ["#FFF6D6", "Sarı"], ["#E5F6EA", "Yeşil"]];
const letterSeen = new Set();

function fmtLeft(ms) {
  if (ms <= 0) return "şimdi";
  const m = Math.ceil(ms / 60000);
  const d = Math.floor(m / 1440), hh = Math.floor((m % 1440) / 60), mm = m % 60;
  if (d > 0) return d + " gün" + (hh ? " " + hh + " saat" : "");
  if (hh > 0) return hh + " saat" + (mm ? " " + mm + " dakika" : "");
  return mm + " dakika";
}
const letterOpenable = l => Date.now() >= (l.openAt || 0);
const letterOpenedBy = (l, uid) => !!((l.opened || {})[uid]);
const fmtDT = ms => fmtDate.format(new Date(ms)) + " " + fmtTime.format(new Date(ms));

function openLetter(l) {
  const firstTime = !isMine(l) && !letterOpenedBy(l, me.uid);
  if (firstTime) {
    const F = firebase.firestore;
    itemsCol().doc(l.id).update(new F.FieldPath("opened", me.uid), Date.now()).catch(() => {});
  }
  const root = $("dialog");
  const close = () => { root.classList.remove("show"); setTimeout(() => { root.hidden = true; root.replaceChildren(); }, 160); };
  const paper = h("div", { class: "letter-paper", style: "--paper:" + (l.paper || LETTER_PAPERS[0][0]) },
    h("div", { class: "letter-meta" }, h("span", { text: (l.type === "note" ? "📝 " : "💌 ") + (isMine(l) ? "Senden" : l.ownerName + "'den") }), h("span", { text: fmtDate.format(new Date(l.at || Date.now())) })),
    l.title ? h("h2", { text: l.title }) : null,
    h("p", { class: "letter-text", text: l.text || "" }),
    h("p", { class: "letter-sign", text: "♡ " + (l.ownerName || "") }));
  root.replaceChildren(
    h("div", { class: "dlg-back", onclick: close }),
    h("div", { class: "letter-modal" + (firstTime ? " anim" : ""), role: "dialog", "aria-modal": "true", "aria-label": l.title || "Mektup" },
      h("div", { class: "env-back" }), paper, h("div", { class: "env-front" }), h("div", { class: "env-flap" }),
      h("button", { class: "btn primary letter-close", type: "button", text: "Kapat", onclick: close }))
  );
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add("show"));
  if (firstTime) setTimeout(() => { for (let i = 0; i < 10; i++) { const s = h("i", { class: "pet-heart", text: ["💗", "💌", "✨"][i % 3], style: "--x:" + (Math.random() * 220 - 110) + "px;--d:" + (i * .07) + "s;top:30%" }); root.append(s); setTimeout(() => s.remove(), 1800); } }, 700);
}

function checkLetters() {
  if (!me) return;
  const ready = listOf("letter").filter(l => !isMine(l) && (l.viewers || []).includes(me.uid) && letterOpenable(l) && !letterOpenedBy(l, me.uid) && !letterSeen.has(l.id));
  if (!ready.length) return;
  ready.forEach(l => letterSeen.add(l.id));
  const names = [...new Set(ready.map(l => l.ownerName))];
  showToast(ready.length === 1 ? ready[0].ownerName + "'den bir " + (ready[0].type === "note" ? "notun" : "mektubun") + " var 💌" : ready.length + " yeni mektubun var 💌",
    ready.length === 1 ? "Açılma zamanı geldi, hadi oku ♡" : names.join(", ") + " sana yazdı.", () => go("letters", { letterTab: "in" }), "Aç");
}

function renderLetters() {
  const tab = state.letterTab || "in";
  const all = listOf("letter");
  const incoming = all.filter(l => !isMine(l)).sort((a, b) => (letterOpenable(b) - letterOpenable(a)) || (letterOpenable(a) ? (b.openAt || 0) - (a.openAt || 0) : (a.openAt || 0) - (b.openAt || 0)));
  const sent = all.filter(isMine).sort((a, b) => (b.at || 0) - (a.at || 0));
  const unread = incoming.filter(l => letterOpenable(l) && !letterOpenedBy(l, me.uid)).length;
  const draft = state.letterDraft || (state.letterDraft = { to: [], type: "letter", paper: LETTER_PAPERS[0][0] });

  const tabs = h("div", { class: "page-tabs" }, [["in", "Gelenler" + (unread ? " (" + unread + ")" : ""), "mail"], ["new", "Yeni yaz", "plus"], ["sent", "Gönderdiklerim", "send"]].map(([k, l, ic]) =>
    h("button", { type: "button", "aria-pressed": tab === k ? "true" : "false", onclick: () => { state.letterTab = k; render(); } }, h("span", { html: ico(ic, 16), style: "display:grid" }), l)));

  let body;
  if (tab === "new") {
    const tomorrow = addDays(today, 1);
    const defDate = draft.date || keyOf(tomorrow);
    body = h("section", { class: "card letter-form t-blush" },
      h("label", { class: "lbl", style: "margin-top:0", text: "Ne yazmak istersin?" }),
      h("div", { class: "vis" }, [["letter", "💌 Sürpriz mektup"], ["note", "📝 Küçük not"]].map(([k, l]) =>
        h("button", { type: "button", "aria-pressed": draft.type === k ? "true" : "false", onclick: () => { draft.type = k; render(); } }, l))),
      h("label", { class: "lbl", text: "Kime?" }),
      profiles.length ? h("div", { class: "aud-people" }, profiles.map(p => {
        const on = draft.to.includes(p.uid);
        return h("button", { type: "button", class: "person" + (on ? " on" : ""), "aria-pressed": on ? "true" : "false",
          onclick: () => { draft.to = on ? draft.to.filter(u => u !== p.uid) : draft.to.concat(p.uid); render(); } }, avatar(p), h("span", { text: p.name }));
      })) : h("p", { class: "empty", text: "Henüz başka profil yok." }),
      h("label", { class: "lbl", for: "ltTitle", text: "Başlık" }),
      h("input", { class: "field", id: "ltTitle", type: "text", placeholder: draft.type === "note" ? "Örn. Günaydın canım" : "Örn. Doğum günün için", value: draft.title || "", style: "width:100%", oninput: e => { draft.title = e.target.value; } }),
      h("label", { class: "lbl", for: "ltText", text: draft.type === "note" ? "Notun" : "Mektubun" }),
      h("textarea", { id: "ltText", rows: "7", class: "letter-input", style: "--paper:" + draft.paper, placeholder: "İçinden geldiği gibi yaz…", oninput: e => { draft.text = e.target.value; } }, draft.text || ""),
      h("label", { class: "lbl", text: "Kağıt rengi" }),
      h("div", { class: "swatches" }, LETTER_PAPERS.map(([hex, label]) =>
        h("button", { type: "button", class: "swatch" + (draft.paper === hex ? " on" : ""), title: label, "aria-label": label, style: "--c:" + hex, onclick: () => { draft.paper = hex; render(); } }))),
      h("label", { class: "lbl", text: "Ne zaman açılabilsin?" }),
      h("div", { class: "row" },
        h("input", { class: "field", id: "ltDate", type: "date", min: todayKey, value: defDate, style: "flex:none", onchange: e => { draft.date = e.target.value; } }),
        h("input", { class: "field", id: "ltTime", type: "time", value: draft.time || "09:00", style: "flex:none;width:8rem", onchange: e => { draft.time = e.target.value; } }),
        h("button", { class: "btn small", type: "button", text: "Hemen açılsın", onclick: () => { const n = new Date(); draft.date = todayKey; draft.time = String(n.getHours()).padStart(2, "0") + ":" + String(n.getMinutes()).padStart(2, "0"); render(); } })),
      h("p", { class: "tag", style: "margin-top:.5rem", text: "O tarihe kadar zarf mühürlü kalır, sadece ne zaman açılacağı görünür." }),
      h("label", { class: "check-row" }, h("input", { type: "checkbox", id: "ltNotify", checked: draft.notify !== false, onchange: e => { draft.notify = e.target.checked; } }), h("span", { text: "Ona bir mektup bıraktığımı haber ver" })),
      h("div", { class: "row", style: "margin-top:1rem" },
        h("button", { class: "btn primary", type: "button", text: draft.type === "note" ? "Notu gönder 📝" : "Mektubu mühürle 💌", onclick: () => {
          const text = ($("ltText").value || "").trim();
          if (!draft.to.length) { showToast("Kime göndereceğini seç", "En az bir kişi seçmelisin."); return; }
          if (!text) { showToast("Bir şeyler yaz ♡", "Mektup boş kalamaz."); return; }
          const [y, mo, d] = ($("ltDate").value || todayKey).split("-").map(Number);
          const [hh, mi] = ($("ltTime").value || "09:00").split(":").map(Number);
          const openAt = new Date(y, mo - 1, d, hh || 0, mi || 0).getTime();
          addItem("letter", { title: ($("ltTitle").value || "").trim(), text, type: draft.type, paper: draft.paper, openAt, opened: {} }, { vis: "some", mode: "only", people: draft.to.slice() });
          if (draft.notify !== false) draft.to.forEach(u => sendQuickMessage(u, { text: (draft.type === "note" ? "📝 Sana bir not bıraktım" : "💌 Sana bir mektup bıraktım") + (openAt > Date.now() + 60000 ? ", " + fmtDT(openAt) + " tarihinde açılabilecek ♡" : ", Birbirimize sayfasından okuyabilirsin ♡") }).catch(() => {}));
          showToast(draft.type === "note" ? "Notun gönderildi 📝" : "Mektubun mühürlendi 💌", openAt > Date.now() + 60000 ? fmtDT(openAt) + " tarihinde açılabilecek." : "Hemen okuyabilir.");
          state.letterDraft = null; state.letterTab = "sent"; render();
        } }))
    );
  } else {
    const list = tab === "in" ? incoming : sent;
    body = list.length ? h("div", { class: "envelopes" }, list.map(l => {
      const ok = letterOpenable(l);
      const mine = isMine(l);
      const read = mine ? Object.keys(l.opened || {}).length > 0 : letterOpenedBy(l, me.uid);
      const toNames = (l.viewers || []).map(nameOfUid).join(", ");
      const canRead = mine || ok;
      return h("article", { class: "envelope" + (ok ? " ready" : " sealed") + (read ? " read" : ""), style: "--paper:" + (l.paper || LETTER_PAPERS[0][0]) },
        h("div", { class: "env-art", onclick: () => canRead ? openLetter(l) : showToast("Bu zarf henüz mühürlü 🔒", fmtDT(l.openAt) + " tarihinde açılabilecek (" + fmtLeft(l.openAt - Date.now()) + " kaldı).") },
          h("span", { class: "env-seal", text: ok ? (read ? "✓" : "♡") : "🔒" })),
        h("div", { class: "env-info" },
          h("strong", { text: (l.type === "note" ? "📝 " : "💌 ") + (l.title || (l.type === "note" ? "Küçük not" : "Sürpriz mektup")) }),
          h("small", { text: mine ? "Kime: " + toNames : "Kimden: " + l.ownerName }),
          h("small", { class: ok ? "ok" : "", text: ok ? (mine ? (read ? "Açıldı ve okundu ♡" : "Açılabilir, henüz okunmadı") : (read ? "Okudun ♡" : "Açılma zamanı geldi!")) : "🔒 " + fmtDT(l.openAt) + " (" + fmtLeft(l.openAt - Date.now()) + ")" })),
        h("div", { class: "row", style: "gap:.3rem;justify-content:flex-end" },
          canRead ? h("button", { class: "btn small" + (!mine && ok && !read ? " primary" : ""), type: "button", text: !mine && ok && !read ? "Aç 💌" : "Oku", onclick: () => openLetter(l) }) : null,
          delBtn(l, l.title || "Mektup", "Bu mektup silinsin mi?")));
    })) : h("p", { class: "empty", text: tab === "in" ? "Henüz sana gelen bir mektup yok. Belki yakında bir sürpriz gelir ♡" : "Henüz kimseye yazmadın. Yeni yaz sekmesinden ilk mektubunu yaz ♡" });
  }

  return h("div", {},
    pageHead("Birbirimize", "Sevdiklerine notlar ve sürpriz mektuplar bırak. Seçtiğin tarihe kadar zarf mühürlü kalır."),
    tabs, body);
}

function pageTabs(items) {
  return h("div", { class: "page-tabs" }, items.map(([v, label, icon]) =>
    h("button", { type: "button", "aria-pressed": state.view === v ? "true" : "false", onclick: () => go(v) }, h("span", { html: ico(icon, 16), style: "display:grid" }), label)));
}
function withTabs(node, items) {
  const tabs = pageTabs(items);
  if (node.firstChild && node.firstChild.classList && node.firstChild.classList.contains("page-head")) node.insertBefore(tabs, node.firstChild.nextSibling);
  else node.prepend(tabs);
  return node;
}
const TABS_NOTES = [["notes", "Notlar", "note"], ["goals", "Hedefler", "target"]];
const TABS_CAL = [["calendar", "Takvim", "calendar"], ["habits", "Alışkanlıklar", "repeat"]];
const NAV_HIDE = ["goals", "habits"];
const NAV_ALIAS = { goals: "notes", habits: "calendar" };
