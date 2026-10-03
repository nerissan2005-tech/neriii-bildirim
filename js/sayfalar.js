function installCard() {
  const p = platformInfo();
  let hidden = false;
  try { hidden = localStorage.getItem("neriii-install-hint") === "1"; } catch (e) {}
  if (p.standalone || hidden || !(p.ios || p.android || installPrompt)) return null;
  const close = e => { try { localStorage.setItem("neriii-install-hint", "1"); } catch (ex) {} e.currentTarget.closest(".ios-hint").remove(); };
  return h("section", { class: "card ios-hint span-12", "data-install": "" },
    h("img", { src: "icons/icon.svg", alt: "", width: "56", height: "56" }),
    h("div", { style: "flex:1;min-width:0" },
      h("strong", { text: "Neriii'yi telefonuna indir ♡" }),
      h("p", { text: "Ana ekranında hayalet simgesiyle dursun, uygulama gibi tam ekran açılsın." }),
      h("button", { class: "btn primary small", type: "button", style: "margin-top:.6rem", onclick: installApp },
        h("span", { html: ico("download", 15), style: "display:inline-grid;vertical-align:-3px;margin-right:.35rem" }), "Uygulamayı indir")),
    h("button", { class: "icon-btn", type: "button", "aria-label": "Kapat", html: ico("x", 18), onclick: close })
  );
}

function mobTitle(c, mob) {
  const t = c.querySelector("h2");
  if (!t) return c;
  const d = t.textContent;
  t.replaceChildren(h("span", { class: "t-d", text: d }), h("span", { class: "t-m", text: mob }));
  return c;
}

function renderHome() {
  const grid = h("div", { class: "grid" });
  const hint = installCard();
  if (hint) grid.append(hint);

  if (site.announcement) {
    grid.append(h("section", { class: "card announce span-12" },
      h("div", { class: "card-head" }, h("span", { class: "ci", html: ico("shield", 22) }), h("h2", { text: "Duyuru" }),
        h("span", { class: "tag", text: (site.byName || "Yönetici") + (site.at ? ", " + fmtShort.format(new Date(site.at)) : "") })),
      h("p", { class: "announce-text", text: site.announcement })
    ));
  }

  grid.append(h("section", { class: "hero span-9 m-hero", html: HERO_SVG },
    h("div", { class: "hero-in" },
      h("p", { class: "hero-label", html: ico("star", 14) + "<span>Günün olumlaması</span>" }, catTag(todayAff().cat)),
      h("p", { class: "hero-text", text: affirmation() + " ♡" }),
      h("button", {
        class: "hero-copy", type: "button", text: "Kopyala",
        onclick: async e => {
          const b = e.currentTarget;
          try { await navigator.clipboard.writeText(affirmation()); b.textContent = "Kopyalandı"; }
          catch (err) { b.textContent = "Kopyalanamadı"; }
        }
      })
    )
  ));

  grid.append(card({
    title: "Bugünün Planı", icon: "calendar", span: "span-3 m-plan",
    extra: h("span", { class: "tag", text: fmtShort.format(today) }),
    body: [
      checklist(plansOn(todayKey), { empty: "Bugün için henüz plan yok." }),
      addForm("plan-home", "Plana ekle", "plan", (t, v) => addItem("plan", { text: t, date: todayKey, done: false }, v))
    ]
  }));

  const goalsTop = listOf("goal").slice(0, 3);
  const goalsMini = h("div", { class: "m-only home-goals" },
    h("p", { class: "mini-title", text: "Hedeflerim" }),
    goalsTop.length
      ? h("div", {}, goalsTop.map(g => h("div", { class: "goal" },
          h("div", { class: "goal-top" }, h("span", { text: g.text }), h("span", { text: "%" + (g.progress || 0) })),
          h("div", { class: "bar" }, h("i", { style: "width:" + (g.progress || 0) + "%" })))))
      : h("p", { class: "empty", text: "Ulaşmak istediğin ilk hedefi ekle." }),
    h("button", { class: "more", type: "button", text: "Tüm hedefler", onclick: () => go("goals") }));
  const notes = listOf("note").sort((a, b) => b.upd - a.upd).slice(0, 4);
  const notesCard = card({
    title: "Notlarım", icon: "note", tint: "t-peach", span: "span-3 m-notes", onAdd: newNote, more: ["Tüm notlar", "notes"], doodle: "leaf",
    body: [notes.length
      ? h("ul", { class: "links" }, notes.map(n => h("li", {}, h("button", { type: "button", onclick: () => go("notes", { noteId: n.id }) }, h("span", { text: n.title || "Başlıksız not" })))))
      : h("p", { class: "empty", text: "Aklına geleni yazmak için + simgesine dokun." }), goalsMini]
  });
  mobTitle(notesCard, "Notlar - Hedeflerim");
  grid.append(notesCard);

  const habits = listOf("habit").slice(0, 5);
  const habitsCard = card({
    title: "Alışkanlıklar", icon: "repeat", tint: "t-sage", span: "span-3 m-habits", more: ["Tüm alışkanlıklar", "habits"], doodle: "sprout",
    onAdd: () => go("habits", { focus: "#add-habit" }),
    body: [habits.length
      ? h("ul", { class: "checks" }, habits.map(hb => {
          const on = !!doneOf(hb)[todayKey];
          const st = streakOf(hb);
          return h("li", { class: on ? "done" : "" },
            h("label", {},
              h("input", { type: "checkbox", checked: on, onchange: e => toggleHabit(hb, todayKey, e.target.checked) }),
              h("span", { text: hb.name })
            ),
            st ? h("span", { class: "streak", text: st + " gün" }) : null
          );
        }))
      : h("p", { class: "empty", text: "Her gün yapmak istediğin bir şey ekle." })]
  });
  mobTitle(habitsCard, "Alışkanlıklarım - Takvim");
  habitsCard.append(h("div", { class: "m-only" }, h("button", { class: "more", type: "button", text: "Takvimi aç", onclick: () => go("calendar") })));
  grid.append(habitsCard);

  const dIdx = affDay();
  const past = [];
  for (let i = dIdx - 1; i >= 0 && past.length < 4; i--) past.push(affAt(i));
  grid.append(card({
    title: "Olumlamalarım", icon: "star", tint: "t-lilac", span: "span-3 m-aff", more: ["Tüm olumlamalar", "affirm"], doodle: "moon",
    onAdd: () => go("affirm", { focus: "#myAffText" }),
    body: [past.length
      ? h("ul", { class: "links" }, past.map(x => h("li", {}, h("button", { type: "button", onclick: () => go("affirm") }, h("span", { text: x.text })))))
      : h("p", { class: "empty", text: "Her gün yeni bir olumlama açılır. Önceki günlerin olumlamaları burada birikecek." })]
  }));

  const pc = petCard();
  if (pc && pc.classList) pc.classList.add("m-pet");
  if (pc) grid.append(pc);

  const goals = listOf("goal").slice(0, 4);
  grid.append(card({
    title: "Hedeflerim", icon: "target", tint: "t-blush", span: "span-3 m-goals", more: ["Tüm hedefler", "goals"], doodle: "flag",
    onAdd: () => go("goals", { focus: "#goalText" }),
    body: [goals.length
      ? h("div", {}, goals.map(g => h("div", { class: "goal" },
          h("div", { class: "goal-top" }, h("span", { text: g.text }), h("span", { text: "%" + (g.progress || 0) })),
          h("div", { class: "bar" }, h("i", { style: "width:" + (g.progress || 0) + "%" }))
        )))
      : h("p", { class: "empty", text: "Ulaşmak istediğin ilk hedefi ekle." })]
  }));

  const payAll = payOpen();
  const payInc = sumAmt(myIncomes());
  const payCur = payPlan(1)[0];
  const payDebtAll = payAll.reduce((t, p) => t + payDebt(p), 0);
  const payCard = card({
    title: "Ödemelerim", icon: "wallet", tint: "t-sage", span: "span-3 m-pay", doodle: "leaf",
    onAdd: () => go("shopping", { shopTab: "pay", focus: "#payName" }),
    body: [
      payInc ? h("p", { class: "pay-total " + (payInc - payCur.total >= 0 ? "pos" : "neg"), style: "margin:0 0 .5rem", text: "Maaştan kalan: " + fmtMoney.format(payInc - payCur.total) }) : null,
      payAll.length
        ? h("ul", { class: "checks pay-list" }, payAll.slice(0, 4).map(p => payRow(p, true)))
        : h("p", { class: "empty", text: "Faturalarını ve taksitlerini ekle, unutma ♡" }),
      payDebtAll > 0 ? h("p", { class: "pay-total", text: "Toplam borcum: " + fmtMoney.format(payDebtAll) }) : null
    ]
  });
  payCard.append(h("button", { class: "more", type: "button", text: "Tüm ödemeler", onclick: () => go("shopping", { shopTab: "pay" }) }));
  grid.append(payCard);

  grid.append(card({ title: "Takvim", icon: "calendar", span: "span-3 m-cal", more: ["Tüm etkinlikler", "calendar"], body: [monthGrid(false)] }));

  const shopCard = card({
    title: "Alışveriş Listesi", icon: "cart", span: "span-3 m-shop", doodle: "basket",
    onAdd: focusAdd("shop-home"),
    body: [
      checklist(listOf("shop").slice(0, 6), { empty: "Liste boş." }),
      addForm("shop-home", "Listeye ekle", "shop", (t, v) => addItem("shop", { text: t, done: false }, v))
    ]
  });
  shopCard.append(h("button", { class: "more", type: "button", text: "Tüm liste", onclick: () => go("shopping", { shopTab: "shop" }) }));
  grid.append(shopCard);

  const weatherBox = h("div", {});
  grid.append(h("div", { class: "stack span-3 home-stack" },
    h("section", { class: "card m-weather" }, weatherBox),
    card({ title: "Bugün nasılsın?", icon: "heart", span: "m-mood", body: [moodPicker(todayKey)], more: ["Günlüğe yaz", "journal"] })
  ));
  loadWeather(weatherBox);

  const ideas = h("section", { class: "ideas" },
    h("h2", { text: "Daha fazlası için öneriler" }),
    h("div", { class: "ideas-wrap" },
      h("p", { class: "ideas-hand", html: "Senin için<br>küçük fikirler ♡<svg viewBox=\"0 0 60 40\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\"><path d=\"M6 6 C 10 26 26 34 52 30 M44 22 L52 30 L42 36\"/></svg>" }),
      h("div", { class: "tiles" }, TILES.map(([v, title, desc, icon, color]) =>
        h("button", { class: "tile", type: "button", onclick: () => go(v) },
          h("span", { class: "tile-ic", style: "background:" + color, html: ico(icon, 22) }),
          h("h3", { text: title }),
          h("p", { text: desc })
        )
      ))
    )
  );
  return h("div", {}, grid, ideas);
}

function newNote() {
  const id = addItem("note", { title: "", body: "" }, getVis("note"));
  go("notes", { noteId: id, focus: "#noteTitle" });
}

function renderNotes() {
  const notes = listOf("note").sort((a, b) => b.upd - a.upd);
  if (!notes.some(n => n.id === state.noteId)) state.noteId = notes[0] ? notes[0].id : null;
  const cur = notes.find(n => n.id === state.noteId);
  let activeTitle = null;

  const list = h("section", { class: "card t-peach" },
    h("button", { class: "btn primary", type: "button", text: "Yeni not", onclick: newNote }),
    h("div", { style: "margin:.4rem 0 .9rem" }, visPicker("note")),
    notes.length ? notes.map(n => {
      const strong = h("strong", { text: n.title || "Başlıksız not" });
      if (n.id === state.noteId) activeTitle = strong;
      return h("button", { type: "button", class: "item-btn", style: n.id === state.noteId ? "background:#fff" : null, onclick: () => { state.noteId = n.id; render(); } },
        strong, h("span", { class: "item-sub" }, fmtShort.format(new Date(n.upd || n.at)), whoTag(n)));
    }) : h("p", { class: "empty", text: "Henüz not yok." })
  );

  let editor;
  if (cur) {
    const status = h("span", { class: "status", text: "Son düzenleme: " + fmtShort.format(new Date(cur.upd || cur.at)) + " " + fmtTime.format(new Date(cur.upd || cur.at)) + (cur.updName && cur.updName !== me.name ? ", " + cur.updName : "") });
    let st;
    const saving = () => { status.textContent = "Kaydediliyor…"; clearTimeout(st); st = setTimeout(() => { status.textContent = "Kaydedildi"; }, 900); };
    editor = h("section", { class: "card" },
      h("div", { class: "row", style: "justify-content:space-between;margin-bottom:.4rem" },
        isMine(cur) ? itemVis(cur) : h("span", { class: "who" }, h("span", { html: ico("users", 12), style: "display:grid" }), cur.ownerName + " paylaştı"),
        status),
      h("input", { class: "big-title live", id: "noteTitle", type: "text", value: cur.title || "", placeholder: "Başlık", "aria-label": "Not başlığı",
        oninput: e => { updItem(cur, { title: e.target.value }, true); if (activeTitle) activeTitle.textContent = e.target.value || "Başlıksız not"; saving(); } }),
      h("textarea", { class: "bare live", id: "noteBody", placeholder: "Yazmaya başla…", "aria-label": "Not içeriği",
        oninput: e => { updItem(cur, { body: e.target.value }, true); saving(); } }, cur.body || ""),
      canDel(cur) ? h("div", { class: "row", style: "justify-content:flex-end;margin-top:1rem" },
        h("button", { class: "btn danger", type: "button", text: "Notu sil", onclick: () => { delItem(cur, "Bu not silinsin mi?"); state.noteId = null; } })) : null
    );
  } else {
    editor = h("section", { class: "card" }, h("p", { class: "empty", text: "Bir not seç ya da yeni bir not oluştur." }));
  }
  return h("div", {}, pageHead("Notlar", "Fikirlerin, listelerin, aklına gelen her şey. Her not için kimlerin göreceğini sen seçersin."), h("div", { class: "split" }, list, editor));
}

function renderAffirm() {
  petAward("olumlama", 10);
  const d = affDay();
  const t = todayAff();
  const fav = isFav(t.text);
  const top = h("section", { class: "aff-hero" },
    h("div", { class: "aff-top" }, catTag(t.cat), h("span", { class: "aff-count", text: fmtLong.format(today) })),
    h("p", { class: "aff-big", text: t.text }),
    h("div", { class: "row", style: "position:relative" },
      h("button", { class: "btn light", type: "button", text: "Kopyala", onclick: async e => {
        const b = e.currentTarget;
        try { await navigator.clipboard.writeText(t.text); b.textContent = "Kopyalandı"; } catch (err) { b.textContent = "Kopyalanamadı"; }
      } }),
      h("button", { class: "btn light", type: "button", "aria-pressed": fav ? "true" : "false", onclick: () => toggleFav(t.text) },
        h("span", { html: ico("heart", 16), style: "display:grid" }), fav ? "Favorilerimde" : "Favorilere ekle")
    ),
    h("p", { class: "aff-note", text: "Yolculuğunun " + (d + 1) + ". günü. Her gün yeni bir olumlama açılır ve " + AFF_CYCLE + " gün boyunca hiçbiri tekrar etmez." })
  );

  const items = [];
  for (let i = d; i >= 0; i--) items.push(affAt(i));
  listOf("aff").forEach(m => items.push({ cat: m.cat, text: m.text, date: fromKey(m.date), item: m }));
  items.sort((a, b) => b.date - a.date || (b.item ? 1 : 0) - (a.item ? 1 : 0));

  const filters = ["Tümü"].concat(AFF_CATS, ["Favoriler", "Eklenenler"]);
  const match = (f, x) => f === "Tümü" || (f === "Favoriler" ? isFav(x.text) : f === "Eklenenler" ? !!x.item : x.cat === f);
  const f = filters.includes(state.affFilter) ? state.affFilter : "Tümü";
  const shown = items.filter(x => match(f, x));

  const chips = h("div", { class: "chips" }, filters.map(x =>
    h("button", { type: "button", "aria-pressed": x === f ? "true" : "false", onclick: () => { state.affFilter = x; render(); } },
      x, h("small", { text: String(items.filter(y => match(x, y)).length) }))
  ));

  const list = shown.length ? h("ul", { class: "aff-list" }, shown.map(x => h("li", {},
    h("div", { style: "flex:1;min-width:0" },
      h("p", { text: x.text }),
      h("div", { class: "aff-meta" }, catTag(x.cat), h("span", { text: fmtDate.format(x.date) }), x.item ? (whoTag(x.item) || h("span", { text: "Kişisel" })) : null)
    ),
    h("button", { class: "fav" + (isFav(x.text) ? " on" : ""), type: "button", "aria-pressed": isFav(x.text) ? "true" : "false",
      "aria-label": isFav(x.text) ? "Favorilerden çıkar" : "Favorilere ekle", html: ico("heart", 19), onclick: () => toggleFav(x.text) }),
    x.item ? visBtn(x.item) : null,
    x.item ? delBtn(x.item, "Olumlama", "Bu olumlama silinsin mi?") : null
  ))) : h("p", { class: "empty", text: f === "Favoriler" ? "Kalp simgesine dokunduğun olumlamalar burada toplanır."
    : f === "Eklenenler" ? "Sağdaki alandan kendi olumlamanı yazabilirsin."
    : "Bu kategoride henüz açılmış olumlama yok. Her gün yenisi geliyor." });

  const form = h("form", { onsubmit: e => {
    e.preventDefault();
    const text = $("myAffText").value.trim();
    if (!text) return;
    addItem("aff", { text, cat: $("myAffCat").value, date: todayKey }, getVis("aff"));
    $("myAffText").value = "";
    state.affFilter = "Eklenenler";
  } },
    h("textarea", { id: "myAffText", rows: "4", placeholder: "Örn. Bugün kendime güveniyorum.", "aria-label": "Olumlama" }),
    h("div", { class: "row", style: "margin-top:.75rem" },
      h("select", { id: "myAffCat", "aria-label": "Kategori" }, AFF_CATS.map(c => h("option", { text: c }))),
      h("button", { class: "btn primary", type: "submit", text: "Ekle" })
    ),
    visPicker("aff")
  );

  return h("div", {},
    pageHead("Olumlamalar", "Aşk, bolluk, şükür, özgüven, sağlık, huzur ve başarı üzerine her gün yeni bir olumlama."),
    top,
    h("div", { class: "grid" },
      h("section", { class: "card span-8" }, h("div", { class: "card-head" }, h("h2", { text: "Açılan olumlamalar" })), chips, list),
      card({ title: "Kendi olumlamanı yaz", span: "span-4", tint: "t-lilac", doodle: "moon", body: [form] })
    )
  );
}

function renderGoals() {
  const goals = listOf("goal");
  const done = goals.filter(g => (g.progress || 0) >= 100).length;
  const form = h("form", { onsubmit: e => {
    e.preventDefault();
    const t = $("goalText").value.trim();
    if (!t) return;
    addItem("goal", { text: t, area: $("goalArea").value, progress: 0 }, getVis("goal"));
    $("goalText").value = "";
  } },
    h("div", { class: "row" },
      h("input", { class: "field", id: "goalText", type: "text", placeholder: "Yeni bir hedef yaz", "aria-label": "Hedef", autocomplete: "off" }),
      h("select", { id: "goalArea", "aria-label": "Alan" }, AREAS.map(a => h("option", { text: a }))),
      h("button", { class: "btn primary", type: "submit", text: "Ekle" })
    ),
    visPicker("goal")
  );
  const rows = goals.map(g => {
    const pct = h("span", { class: "pct", text: "%" + (g.progress || 0) });
    return h("div", { class: "goal-row" },
      h("div", { class: "row", style: "gap:.5rem" }, h("strong", { text: g.text }), h("span", { class: "tag", text: g.area }), whoTag(g)),
      h("div", { class: "row", style: "gap:.1rem" }, visBtn(g), delBtn(g, g.text, "\"" + g.text + "\" silinsin mi?")),
      h("input", { class: "live", id: "gp-" + g.id, type: "range", min: "0", max: "100", step: "5", value: String(g.progress || 0), "aria-label": g.text + " ilerleme",
        oninput: e => { pct.textContent = "%" + e.target.value; updItem(g, { progress: Number(e.target.value) }, true); },
        onchange: () => flushItem(g.id) }),
      pct
    );
  });
  return h("div", {},
    pageHead("Hedefler", goals.length ? goals.length + " hedef var, " + done + " tanesi tamamlandı." : "Ulaşmak istediğin şeyleri yaz, ilerledikçe çubuğu kaydır."),
    h("section", { class: "card t-blush" }, doodle("flag"), form, rows.length ? h("div", { style: "margin-top:.75rem;position:relative" }, rows) : h("p", { class: "empty", style: "margin-top:1rem", text: "Henüz hedef yok." }))
  );
}

function renderHabits() {
  const habits = listOf("habit");
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(today, -i));
  const body = !habits.length
    ? h("p", { class: "empty", style: "margin-top:1rem", text: "Henüz alışkanlık yok. Yukarıdan ilkini ekle." })
    : h("div", { class: "table-wrap", style: "margin-top:1rem" }, h("table", {},
      h("thead", {}, h("tr", {}, h("th", { text: "Alışkanlık" }), days.map(d => h("th", { text: fmtWd.format(d) })), h("th", { text: "Seri" }), h("th"))),
      h("tbody", {}, habits.map(hb => {
        const done = doneOf(hb);
        return h("tr", {},
          h("td", {}, h("div", { class: "row", style: "gap:.4rem" }, h("span", { text: hb.name }), whoTag(hb))),
          days.map(d => {
            const k = keyOf(d);
            return h("td", {}, h("input", { type: "checkbox", checked: !!done[k], "aria-label": hb.name + ", " + fmtLong.format(d), onchange: e => toggleHabit(hb, k, e.target.checked) }));
          }),
          h("td", {}, h("span", { class: "streak", text: streakOf(hb) + " gün" })),
          h("td", {}, h("div", { class: "row", style: "gap:.1rem;flex-wrap:nowrap" }, visBtn(hb), delBtn(hb, hb.name, "\"" + hb.name + "\" silinsin mi?")))
        );
      }))
    ));
  return h("div", {},
    pageHead("Alışkanlıklar", "Her gün yapmak istediklerin. Paylaşılan alışkanlıklarda herkes kendi günlerini işaretler."),
    h("section", { class: "card t-sage" }, addForm("habit", "Örn. 10 dakika meditasyon", "habit", (t, v) => addItem("habit", { name: t, done: {} }, v)), body)
  );
}

function renderCalendar() {
  const sel = fromKey(state.sel);
  return h("div", {},
    pageHead("Takvim", "Bir güne dokun, o günün planını gör ve düzenle."),
    h("div", { class: "grid" },
      h("section", { class: "card span-7" }, monthGrid(true)),
      card({
        title: fmtLong.format(sel), span: "span-5", tint: "t-peach", doodle: "leaf",
        body: [
          checklist(plansOn(state.sel), { empty: "Bu gün için plan yok." }),
          addForm("plan-day", "Bu güne ekle", "plan", (t, v) => addItem("plan", { text: t, date: state.sel, done: false }, v))
        ]
      })
    )
  );
}

const fmtMoney = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });
const myPays = () => listOf("payment").filter(isMine);
const myIncomes = () => listOf("income").filter(isMine);
const sumAmt = a => a.reduce((s, x) => s + (Number(x.amount) || 0), 0);
const payDebt = p => (Number(p.amount) || 0) * (p.months > 0 ? p.months : 1);
const payOpen = () => myPays().filter(p => !p.done).sort((a, b) => (a.due || "9999-99-99").localeCompare(b.due || "9999-99-99") || (a.at || 0) - (b.at || 0));

function parseMoney(v) {
  let s = String(v || "").replace(/[₺\s]/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = parseFloat(s);
  return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

function nextMonthKey(k, day) {
  const d = fromKey(k);
  const want = day || d.getDate();
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const last = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
  n.setDate(Math.min(want, last));
  return keyOf(n);
}

function payDue(p) {
  if (!p.due) return null;
  const diff = Math.round((fromKey(p.due) - today) / 86400000);
  if (p.done) return { text: fmtShort.format(fromKey(p.due)), cls: "" };
  if (diff < 0) return { text: fmtShort.format(fromKey(p.due)) + ", " + (-diff) + " gün gecikti", cls: " late" };
  if (diff === 0) return { text: "Bugün", cls: " soon" };
  if (diff === 1) return { text: "Yarın", cls: " soon" };
  if (diff <= 3) return { text: diff + " gün sonra", cls: " soon" };
  return { text: fmtShort.format(fromKey(p.due)), cls: "" };
}

function setPaid(p, on) {
  const patch = { done: on, paidAt: on ? Date.now() : 0 };
  const left = p.months > 0 ? p.months : 0;
  if (on && p.repeat && p.due && !p.spawned && isMine(p) && (left === 0 || left > 1)) {
    patch.spawned = true;
    addItem("payment", { text: p.text, amount: p.amount || 0, due: nextMonthKey(p.due, p.day), day: p.day || fromKey(p.due).getDate(), repeat: true, months: left > 1 ? left - 1 : 0, done: false, spawned: false, paidAt: 0 }, "private");
  }
  updItem(p, patch);
}

function payPlan(n) {
  const base = new Date(today.getFullYear(), today.getMonth(), 1);
  const rows = Array.from({ length: n }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth() + i, 1);
    return { key: d.getFullYear() + "-" + pad(d.getMonth() + 1), d, total: 0, paid: 0 };
  });
  const idx = {};
  rows.forEach((r, i) => { idx[r.key] = i; });
  myPays().forEach(p => {
    const amt = Number(p.amount) || 0;
    if (!amt) return;
    if (p.done) {
      if (!p.paidAt) return;
      const mk = keyOf(new Date(p.paidAt)).slice(0, 7);
      if (mk in idx) { rows[idx[mk]].total += amt; rows[idx[mk]].paid += amt; }
      return;
    }
    let mk = (p.due || todayKey).slice(0, 7);
    if (mk < rows[0].key) mk = rows[0].key;
    let [y, m] = mk.split("-").map(Number);
    const times = p.repeat ? (p.months > 0 ? p.months : n) : 1;
    for (let c = 0; c < times; c++) {
      const k = y + "-" + pad(m);
      if (k in idx) rows[idx[k]].total += amt;
      m++; if (m > 12) { m = 1; y++; }
    }
  });
  return rows;
}

function payRow(p, compact) {
  const due = payDue(p);
  const sub = [due && due.text, p.repeat ? (p.months > 0 ? p.months + " taksit kaldı" : "Her ay") : null].filter(Boolean).join(" · ");
  return h("li", { class: "pay-row" + (p.done ? " done" : "") },
    h("label", {},
      h("input", { type: "checkbox", checked: !!p.done, onchange: e => setPaid(p, e.target.checked) }),
      h("span", { class: "pay-main" },
        h("span", { class: "pay-name", text: p.text }),
        sub ? h("small", { class: "pay-sub" + (due ? due.cls : ""), text: sub }) : null)),
    p.amount ? h("span", { class: "pay-amt", text: fmtMoney.format(p.amount) }) : null,
    compact ? null : delBtn(p, p.text, "Bu ödeme silinsin mi?")
  );
}

function statBox(label, value, sub, cls) {
  return h("div", { class: "fin-stat" + (cls ? " " + cls : "") },
    h("span", { class: "fin-l", text: label }),
    h("strong", { class: "fin-v", text: value }),
    sub ? h("small", { text: sub }) : null);
}

function financeSummary() {
  const incomes = myIncomes();
  const income = sumAmt(incomes);
  const cur = payPlan(1)[0];
  const open = payOpen();
  const debt = open.reduce((s, p) => s + payDebt(p), 0);
  const left = income - cur.total;
  return h("section", { class: "card span-12" },
    h("div", { class: "fin-stats" },
      statBox("Aylık gelirim", income ? fmtMoney.format(income) : "—", incomes.length ? "Maaş ve diğer gelirler" : "Aşağıdan maaşını ekle"),
      statBox("Bu ayki ödemelerim", fmtMoney.format(cur.total), "Ödenen " + fmtMoney.format(cur.paid) + " · Kalan " + fmtMoney.format(cur.total - cur.paid)),
      statBox("Maaştan kalan", income ? fmtMoney.format(left) : "—", income ? (left >= 0 ? "Bu ay harcamana kalan" : "Bu ay gelirini aşıyor") : "Maaş eklenince hesaplanır", income ? (left >= 0 ? "pos" : "neg") : ""),
      statBox("Toplam borcum", fmtMoney.format(debt), open.length ? open.length + " açık ödeme, taksitler dahil" : "Açık ödeme yok")
    )
  );
}

function incomeCard() {
  const list = myIncomes();
  const msg = h("p", { class: "err" });
  const form = h("form", { class: "pay-form", onsubmit: e => {
    e.preventDefault();
    const name = $("incName").value.trim() || "Maaş";
    const amount = parseMoney($("incAmt").value);
    if (!amount) { msg.textContent = "Tutarı yaz."; return; }
    const day = Math.min(31, Math.max(0, parseInt($("incDay").value, 10) || 0));
    msg.textContent = "";
    addItem("income", { text: name, amount, day }, "private");
    $("incName").value = ""; $("incAmt").value = ""; $("incDay").value = "";
    showToast("Gelir eklendi ♡");
  } },
    h("div", { class: "row" },
      h("input", { class: "field", id: "incName", type: "text", placeholder: "Maaş", "aria-label": "Gelir adı", autocomplete: "off" }),
      h("input", { class: "field", id: "incAmt", type: "text", inputmode: "decimal", placeholder: "Tutar (₺)", "aria-label": "Tutar", autocomplete: "off", style: "flex:none;width:7.5rem;min-width:0" })),
    h("div", { class: "row", style: "margin-top:.6rem" },
      h("input", { class: "field", id: "incDay", type: "number", min: "1", max: "31", placeholder: "Ayın kaçında yatıyor? (isteğe bağlı)", "aria-label": "Maaş günü", style: "min-width:0" }),
      h("button", { class: "btn primary", type: "submit", text: "Ekle" })),
    msg);
  return card({
    title: "Maaşım ve gelirlerim", icon: "wallet", tint: "t-peach", span: "", doodle: "leaf",
    body: [
      form,
      list.length ? h("ul", { class: "checks pay-list" }, list.map(i => h("li", { class: "pay-row" },
        h("span", { class: "pay-main" }, h("span", { class: "pay-name", text: i.text }), i.day ? h("small", { class: "pay-sub", text: "Her ayın " + i.day + ". günü" }) : null),
        h("span", { class: "pay-amt", text: fmtMoney.format(i.amount || 0) }),
        delBtn(i, i.text, "Bu gelir silinsin mi?")))) : h("p", { class: "empty", text: "Maaşını ekle, kalan tutarı otomatik hesaplayayım." }),
      list.length ? h("p", { class: "pay-total", text: "Aylık toplam: " + fmtMoney.format(sumAmt(list)) }) : null
    ]
  });
}

function planCard() {
  const income = sumAmt(myIncomes());
  const rows = payPlan(6).filter((r, i) => i === 0 || r.total > 0);
  return card({
    title: "Ödeme planım", icon: "calendar", tint: "t-lilac", span: "",
    body: [
      h("div", { class: "plan" }, rows.map(r => {
        const left = income - r.total;
        const pct = income ? Math.min(100, Math.round(r.total / income * 100)) : 0;
        return h("div", { class: "plan-row" },
          h("div", { class: "plan-top" }, h("strong", { text: fmtMonth.format(r.d) }), h("span", { text: fmtMoney.format(r.total) })),
          income ? h("div", { class: "bar" + (left < 0 ? " over" : "") }, h("i", { style: "width:" + pct + "%" })) : null,
          income ? h("small", { class: "plan-left " + (left >= 0 ? "pos" : "neg"), text: left >= 0 ? "Maaştan kalan " + fmtMoney.format(left) : fmtMoney.format(-left) + " açık" }) : null);
      })),
      h("p", { class: "empty", style: "margin-top:.8rem", text: "Her ay tekrarlayan ödemeler ve taksitler plana kendiliğinden eklenir." })
    ]
  });
}

function paymentsCard() {
  const open = payOpen();
  const paid = myPays().filter(p => p.done).sort((a, b) => (b.paidAt || 0) - (a.paidAt || 0));
  const msg = h("p", { class: "err" });
  const form = h("form", { class: "pay-form", onsubmit: e => {
    e.preventDefault();
    const name = $("payName").value.trim();
    if (!name) { msg.textContent = "Ödemenin adını yaz."; return; }
    const amount = parseMoney($("payAmt").value);
    if (!amount) { msg.textContent = "Tutarı yaz."; return; }
    const type = $("payType").value;
    const due = $("payDue").value || "";
    const months = type === "inst" ? Math.max(0, parseInt($("payMonths").value, 10) || 0) : 0;
    if (type === "inst" && months < 1) { msg.textContent = "Kaç taksit kaldığını yaz."; return; }
    if (type !== "once" && !due) { msg.textContent = "Tekrarlayan ödeme için bir tarih seç."; return; }
    msg.textContent = "";
    addItem("payment", { text: name, amount, due, day: due ? fromKey(due).getDate() : 0, repeat: type !== "once", months, done: false, spawned: false, paidAt: 0 }, "private");
    $("payName").value = ""; $("payAmt").value = ""; $("payDue").value = ""; $("payMonths").value = ""; $("payType").value = "once"; $("payMonthsWrap").hidden = true;
    showToast("Ödeme eklendi ♡");
  } },
    h("div", { class: "row" },
      h("input", { class: "field", id: "payName", type: "text", placeholder: "Örn. Kredi kartı, elektrik faturası", "aria-label": "Ödeme adı", autocomplete: "off" }),
      h("input", { class: "field", id: "payAmt", type: "text", inputmode: "decimal", placeholder: "Tutar (₺)", "aria-label": "Tutar", autocomplete: "off", style: "flex:none;width:7.5rem;min-width:0" })),
    h("div", { class: "row", style: "margin-top:.6rem" },
      h("select", { id: "payType", "aria-label": "Ödeme türü", onchange: e => { $("payMonthsWrap").hidden = e.target.value !== "inst"; } },
        h("option", { value: "once", text: "Tek seferlik" }),
        h("option", { value: "monthly", text: "Her ay (fatura, abonelik)" }),
        h("option", { value: "inst", text: "Taksit / borç" })),
      h("span", { id: "payMonthsWrap", hidden: true },
        h("input", { class: "field", id: "payMonths", type: "number", min: "1", max: "120", placeholder: "Kaç taksit kaldı?", "aria-label": "Kalan taksit", style: "min-width:0;width:9rem" })),
      h("input", { class: "field", id: "payDue", type: "date", style: "flex:none;min-width:0", "aria-label": "Ödeme tarihi" })),
    h("p", { class: "tag", style: "margin-top:.4rem", text: "Tarih: son ödeme günü (taksitte sıradaki taksit günü)." }),
    h("div", { class: "row", style: "margin-top:.5rem" }, h("button", { class: "btn primary", type: "submit", text: "Ödemeyi ekle" })),
    msg);
  const doneMine = paid.filter(canDel);
  return card({
    title: "Ödemelerim", icon: "wallet", tint: "t-sage", span: "span-7", doodle: "basket",
    body: [
      form,
      open.length ? h("ul", { class: "checks pay-list" }, open.map(p => payRow(p))) : h("p", { class: "empty", text: "Yaklaşan ödeme yok. Faturalarını, borçlarını ve taksitlerini ekle, unutma ♡" }),
      paid.length ? h("p", { class: "pay-done-title", text: "Ödenenler" }) : null,
      paid.length ? h("ul", { class: "checks pay-list" }, paid.slice(0, 8).map(p => payRow(p))) : null,
      doneMine.length ? h("button", { class: "btn", type: "button", style: "margin-top:1rem;align-self:flex-start;position:relative", text: "Ödenenleri temizle (" + doneMine.length + ")",
        onclick: async () => { if (await ask({ title: "Ödenenler temizlensin mi?", text: "İşaretlenen " + doneMine.length + " ödeme listeden kaldırılacak.", ok: "Temizle", icon: "wallet" })) doneMine.forEach(i => delItem(i)); } }) : null
    ]
  });
}

function renderShopping() {
  const tab = state.shopTab || "pay";
  const tabs = h("div", { class: "page-tabs" }, [["pay", "Ödemelerim", "wallet"], ["shop", "Alışveriş Listesi", "cart"]].map(([k, l, ic]) =>
    h("button", { type: "button", "aria-pressed": tab === k ? "true" : "false", onclick: () => { state.shopTab = k; render(); } }, h("span", { html: ico(ic, 16), style: "display:grid" }), l)));
  let body;
  if (tab === "shop") {
    const items = listOf("shop");
    const doneMine = items.filter(i => i.done && canDel(i));
    body = h("section", { class: "card t-lilac", style: "max-width:42rem" },
      doodle("basket"),
      addForm("shop", "Listeye ekle", "shop", (t, v) => addItem("shop", { text: t, done: false }, v)),
      h("div", { style: "margin-top:.75rem;position:relative" }, checklist(items, { empty: "Liste boş." })),
      doneMine.length ? h("button", { class: "btn", type: "button", style: "margin-top:1rem;align-self:flex-start;position:relative", text: "Alınanları temizle (" + doneMine.length + ")",
        onclick: async () => { if (await ask({ title: "Alınanlar temizlensin mi?", text: "İşaretlenen " + doneMine.length + " ürün listeden kaldırılacak.", ok: "Temizle", icon: "cart" })) doneMine.forEach(i => delItem(i)); } }) : null
    );
  } else {
    body = h("div", { class: "grid" },
      financeSummary(),
      paymentsCard(),
      h("div", { class: "stack span-5" }, incomeCard(), planCard())
    );
  }
  return h("div", {},
    pageHead("Ödemelerim ve Alışveriş", tab === "pay" ? "Maaşını gir, ödemelerini ekle; kalanı ve toplam borcunu otomatik hesaplasın." : "Alınacakları yaz, aldıkça işaretle."),
    tabs, body);
}

function toggleAmin(it) {
  const F = firebase.firestore;
  const on = !!((it.amins || {})[me.uid]);
  itemsCol().doc(it.id).update(new F.FieldPath("amins", me.uid), on ? F.FieldValue.delete() : Date.now(), "upd", Date.now()).catch(writeFail);
}

function prayedToday() {
  data.prayed = data.prayed || {};
  return data.prayed[todayKey] || [];
}
function togglePrayed(id) {
  const list = prayedToday().slice();
  const i = list.indexOf(id);
  if (i > -1) list.splice(i, 1); else { list.push(id); petAward("dua", 10); }
  data.prayed = { [todayKey]: list };
  save();
  render();
}

function prayerCard(o) {
  const done = prayedToday();
  const read = done.includes(o.id);
  const open = state.mealOpen || {};
  return h("article", { class: "prayer builtin-card" + (read ? " read" : ""), id: "dua-" + o.id },
    h("div", { class: "prayer-head" },
      h("span", { class: "prayer-ic", html: ico("moon", 18) }),
      h("div", { style: "flex:1;min-width:0" }, o.titleEl || h("h3", { text: o.title }), h("div", { class: "prayer-sub" }, h("span", { class: "tag", text: o.sub }), o.who || null)),
      o.badge ? h("span", { class: "who mine", text: o.badge }) : null,
      o.tools && o.tools.some(Boolean) ? h("div", { class: "prayer-tools" }, o.tools) : null),
    o.body,
    o.meal && open[o.id] ? h("p", { class: "meal", text: o.meal }) : null,
    h("div", { class: "prayer-foot" },
      h("button", { class: "amin" + (read ? " on" : ""), type: "button", "aria-pressed": read ? "true" : "false", onclick: () => togglePrayed(o.id) }, read ? "✓ Bugün okudum" : "📖 Okudum"),
      o.amin || null,
      o.meal ? h("button", { class: "more", type: "button", style: "margin:0;padding:0", text: open[o.id] ? "Anlamını gizle" : "Anlamını göster",
        onclick: () => { state.mealOpen = Object.assign({}, open, { [o.id]: !open[o.id] }); render(); } }) : null)
  );
}

function renderPrayers() {
  const all = listOf("prayer").sort((a, b) => (b.at || 0) - (a.at || 0));
  const f = state.prayerCat || "Tümü";
  const form = h("form", { onsubmit: e => {
    e.preventDefault();
    const title = $("prTitle").value.trim(), text = $("prText").value.trim();
    if (!title && !text) return;
    addItem("prayer", { title: title || "Dua", text, cat: $("prCat").value, amins: {} }, getVis("prayer"));
    $("prTitle").value = ""; $("prText").value = "";
    state.prayerCat = "Tümü";
  } },
    h("div", { class: "row" },
      h("input", { class: "field", id: "prTitle", type: "text", placeholder: "Duanın adı, örn. Sabah duası", "aria-label": "Duanın adı", autocomplete: "off" }),
      h("select", { id: "prCat", "aria-label": "Kategori" }, PRAYER_CATS.map(c => h("option", { text: c })))),
    h("textarea", { id: "prText", rows: "3", style: "margin-top:.6rem", placeholder: "Duanı buraya yaz…", "aria-label": "Dua" }),
    h("div", { class: "row", style: "justify-content:space-between;align-items:flex-start;margin-top:.4rem" },
      visPicker("prayer"),
      h("button", { class: "btn primary", type: "submit", style: "margin-top:.5rem", text: "Duayı ekle" }))
  );

  const userCards = all.filter(p => f === "Tümü" || p.cat === f).map(p => {
    const amins = Object.keys(p.amins || {});
    const mineAmin = amins.includes(me.uid);
    const editing = state.prayerEdit === p.id && isMine(p);
    const lines = (p.text || "").split("\n").map(x => x.trim()).filter(Boolean);
    return prayerCard({
      id: p.id,
      title: p.title || "Dua",
      titleEl: editing ? h("input", { class: "field live", id: "pe-t-" + p.id, value: p.title || "", "aria-label": "Duanın adı", oninput: e => updItem(p, { title: e.target.value }, true) }) : null,
      sub: p.cat || "Dua",
      who: whoTag(p),
      tools: [visBtn(p),
        isMine(p) ? h("button", { class: "icon-btn sm", type: "button", "aria-label": editing ? "Düzenlemeyi bitir" : "Düzenle", html: ico(editing ? "check" : "note", 16),
          onclick: () => { flushItems(); state.prayerEdit = editing ? null : p.id; state.focus = editing ? null : "#pe-x-" + p.id; render(); } }) : null,
        delBtn(p, p.title, "Bu dua silinsin mi?")],
      body: editing
        ? h("textarea", { class: "live", id: "pe-x-" + p.id, rows: "5", "aria-label": "Dua", oninput: e => updItem(p, { text: e.target.value }, true) }, p.text || "")
        : lines.length ? h("div", { class: "okunus" }, lines.map(l => h("p", { text: l }))) : null,
      amin: h("span", { class: "row", style: "gap:.5rem" },
        h("button", { class: "amin" + (mineAmin ? " on" : ""), type: "button", "aria-pressed": mineAmin ? "true" : "false", onclick: () => toggleAmin(p) }, "🤲 ", mineAmin ? "Amin dedin" : "Amin"),
        amins.length ? h("span", { class: "tag", title: amins.map(u => u === me.uid ? me.name : nameOfUid(u)).join(", "),
          text: amins.length === 1 && mineAmin ? "Sen amin dedin" : amins.length + " kişi amin dedi" }) : null)
    });
  });
  const builtinCards = (f === "Tümü" || f === "Sureler") ? BUILTIN_PRAYERS.map(p => prayerCard({ id: p.id, title: p.title, sub: p.sub, badge: p.kind, body: h("div", { class: "okunus" }, p.lines.map(l => h("p", { text: l }))), meal: p.meal })) : [];
  const shownCards = (f === "Sureler" ? [] : userCards).concat(builtinCards);

  const cats = ["Tümü", "Sureler"].concat(PRAYER_CATS.filter(c => all.some(p => p.cat === c)));
  const chips = h("div", { class: "chips" }, cats.map(c =>
    h("button", { type: "button", "aria-pressed": c === f ? "true" : "false", onclick: () => { state.prayerCat = c; render(); } }, c === "Sureler" ? "Sureler ve dualar" : c,
      h("small", { text: String(c === "Tümü" ? all.length + BUILTIN_PRAYERS.length : c === "Sureler" ? BUILTIN_PRAYERS.length : all.filter(p => p.cat === c).length) }))));

  const ids = all.map(p => p.id).concat(BUILTIN_PRAYERS.map(p => p.id));
  const readN = prayedToday().filter(id => ids.includes(id)).length;

  return h("div", {},
    pageHead("Dualarımız", "Duanı yaz, sureleri ve duaları oku, istersen sevdiklerinle paylaş ve birlikte amin deyin."),
    h("div", { class: "grid" },
      h("section", { class: "card span-12 t-sage" }, doodle("moon"), h("h3", { class: "form-title", text: "Yeni dua ekle" }), form)),
    h("div", { class: "builtin-head", style: "margin-top:1.75rem" },
      h("h3", { text: "Dualarımız" }),
      h("span", { class: "tag", text: "Bugün " + readN + " / " + ids.length + " okundu" })),
    chips,
    shownCards.length ? h("div", { class: "prayer-list" }, shownCards) : h("p", { class: "empty", text: "Bu kategoride dua yok." })
  );
}

function renderBooks() {
  const books = listOf("book");
  const form = h("form", { onsubmit: e => {
    e.preventDefault();
    const t = $("bookTitle").value.trim();
    if (!t) return;
    addItem("book", { title: t, author: $("bookAuthor").value.trim(), status: "Okunacak" }, getVis("book"));
    $("bookTitle").value = ""; $("bookAuthor").value = "";
    $("bookTitle").focus();
  } },
    h("div", { class: "row" },
      h("input", { class: "field", id: "bookTitle", type: "text", placeholder: "Kitap adı", "aria-label": "Kitap adı", autocomplete: "off" }),
      h("input", { class: "field", id: "bookAuthor", type: "text", placeholder: "Yazar", "aria-label": "Yazar", autocomplete: "off" }),
      h("button", { class: "btn primary", type: "submit", text: "Ekle" })
    ),
    visPicker("book")
  );
  const tints = { "Okunacak": "t-peach", "Okunuyor": "t-sage", "Bitti": "t-lilac" };
  const cols = BOOK_STATUSES.map(s => {
    const items = books.filter(b => b.status === s);
    return card({
      title: s + " (" + items.length + ")", span: "span-4", tint: tints[s],
      body: [items.length ? h("ul", { class: "checks" }, items.map(b => h("li", {},
        h("div", { style: "flex:1;min-width:0;padding:.4rem 0" }, h("div", { text: b.title }), h("div", { class: "row", style: "gap:.4rem" }, b.author ? h("span", { class: "tag", text: b.author }) : null, whoTag(b))),
        h("select", { "aria-label": b.title + " durumu", style: "padding:.3rem .5rem;font-size:.8rem", onchange: e => updItem(b, { status: e.target.value }) },
          BOOK_STATUSES.map(x => h("option", { text: x, selected: x === b.status }))),
        visBtn(b), delBtn(b, b.title)
      ))) : h("p", { class: "empty", text: "Boş." })]
    });
  });
  return h("div", {},
    pageHead("Okuma Listesi", "Okumak istediklerin, okuduğun ve bitirdiklerin."),
    h("section", { class: "card", style: "margin-bottom:1.25rem" }, form),
    h("div", { class: "grid" }, cols)
  );
}


let weatherCache = null;
async function loadWeather(box) {
  const paint = () => box.replaceChildren(h("div", { class: "weather" },
    h("span", { class: "ws", html: ico("sun", 48) }),
    h("div", {},
      h("div", { class: "wcity", text: weatherCache.name }),
      h("div", { class: "wtemp", text: weatherCache.temp + "°C" }),
      h("div", { text: WEATHER[weatherCache.code] || "" })
    )
  ));
  if (!data.city) {
    box.replaceChildren(h("div", { class: "weather" },
      h("span", { class: "ws", html: ico("sun", 48) }),
      h("div", {}, h("p", { class: "empty", text: "Hava durumu için şehrini ekle." }),
        h("button", { class: "more", type: "button", style: "padding-top:.2rem", text: "Ayarlar", onclick: () => go("settings", { focus: "#setCity" }) }))
    ));
    return;
  }
  if (weatherCache && weatherCache.city === data.city) return paint();
  box.replaceChildren(h("p", { class: "empty", text: "Hava durumu yükleniyor…" }));
  try {
    const g = await (await fetch("https://geocoding-api.open-meteo.com/v1/search?count=1&language=tr&name=" + encodeURIComponent(data.city))).json();
    if (!g.results || !g.results.length) throw new Error("bulunamadı");
    const r = g.results[0];
    const w = await (await fetch("https://api.open-meteo.com/v1/forecast?current=temperature_2m,weather_code&timezone=auto&latitude=" + r.latitude + "&longitude=" + r.longitude)).json();
    weatherCache = { city: data.city, name: r.name, temp: Math.round(w.current.temperature_2m), code: w.current.weather_code };
    paint();
  } catch (e) {
    box.replaceChildren(h("p", { class: "empty", text: "Hava durumu alınamadı. Ayarlar'daki şehir adını kontrol et." }));
  }
}

function renderJournal() {
  const k = state.jDate;
  const j = journalOf(k);
  const status = h("span", { class: "status" });
  let timer;
  const saving = () => { status.textContent = "Kaydediliyor…"; clearTimeout(timer); timer = setTimeout(() => { status.textContent = "Kaydedildi"; }, 900); };
  const filled = e => (e.text || "").trim() || e.mood || (e.gratitude || []).some(g => (g || "").trim());
  const entries = listOf("journal").filter(filled).sort((a, b) => b.date.localeCompare(a.date) || (isMine(b) ? 1 : 0) - (isMine(a) ? 1 : 0));
  const other = state.jOther ? entries.find(e => e.id === state.jOther && !isMine(e)) : null;

  let main;
  if (other) {
    main = h("section", { class: "card span-8 t-lilac" },
      h("div", { class: "row", style: "justify-content:space-between;margin-bottom:1rem" },
        h("div", {}, h("strong", { text: other.ownerName + " adlı kişinin günlüğü" }), h("div", { class: "tag", text: fmtLong.format(fromKey(other.date)) })),
        h("button", { class: "btn small", type: "button", text: "Kendi günlüğüme dön", onclick: () => { state.jOther = null; render(); } })),
      other.mood ? h("p", { text: "Ruh hali: " + ((MOODS.find(x => x[0] === other.mood) || ["", ""])[1]) + " " + other.mood }) : null,
      (other.gratitude || []).some(g => (g || "").trim()) ? h("div", {}, h("h3", { style: "margin:1rem 0 .4rem;font-size:1rem", text: "Şükrettiği şeyler" }),
        h("ul", {}, other.gratitude.filter(g => (g || "").trim()).map(g => h("li", { text: g })))) : null,
      other.text ? h("div", {}, h("h3", { style: "margin:1rem 0 .4rem;font-size:1rem", text: "Aklındakiler" }), h("p", { style: "white-space:pre-wrap;margin:0", text: other.text })) : null
    );
  } else {
    main = h("section", { class: "card span-8" },
      h("div", { class: "row", style: "justify-content:space-between;margin-bottom:1rem" },
        h("input", { class: "field", type: "date", value: k, max: todayKey, style: "flex:none", "aria-label": "Tarih",
          onchange: e => { state.jDate = e.target.value || todayKey; render(); } }),
        status
      ),
      h("div", { style: "margin-bottom:1rem" }, j ? itemVis(j) : visPicker("journal")),
      h("h3", { style: "margin:.25rem 0 .6rem;font-size:1rem", text: "Nasıl hissediyorsun?" }),
      moodPicker(k),
      h("h3", { style: "margin:1.5rem 0 .6rem;font-size:1rem", text: "Şükrettiğim üç şey" }),
      h("div", { class: "gratitude" }, [0, 1, 2].map(i =>
        h("input", { class: "field live", id: "gr-" + i, type: "text", value: j ? (j.gratitude || [])[i] || "" : "", placeholder: (i + 1) + ". şey", "aria-label": "Şükran " + (i + 1), autocomplete: "off",
          oninput: e => { const it = ensureJournal(k); const g = (it.gratitude || ["", "", ""]).slice(); g[i] = e.target.value; updItem(it, { gratitude: g }, true); saving(); } })
      )),
      h("h3", { style: "margin:1.5rem 0 .6rem;font-size:1rem", text: "Bugün aklımda" }),
      h("textarea", { class: "live", id: "jText", rows: "9", placeholder: "Yazmaya başla…", "aria-label": "Günlük yazısı",
        oninput: e => { updItem(ensureJournal(k), { text: e.target.value }, true); saving(); if (k === todayKey && e.target.value.trim().length > 20) petAward("gunluk", 20); } }, j ? j.text || "" : ""),
      j && canDel(j) && filled(j) ? h("div", { class: "row", style: "justify-content:flex-end;margin-top:1rem" },
        h("button", { class: "btn danger", type: "button", text: "Bu günü sil", onclick: () => delItem(j, "Bu günün günlüğü silinsin mi?") })) : null
    );
  }

  return h("div", {},
    pageHead("Günlük", "Ruh halin, şükrettiklerin ve aklından geçenler. Her günü kişisel ya da herkese açık kaydedebilirsin."),
    h("div", { class: "grid" },
      main,
      card({
        title: "Önceki günler", span: "span-4", tint: "t-blush",
        body: [entries.length ? h("div", {}, entries.map(e => {
          const preview = (e.text || "").trim() || (e.gratitude || []).filter(g => (g || "").trim()).join(", ") || "";
          const mine = isMine(e);
          return h("button", { class: "entry", type: "button", onclick: () => { if (mine) { state.jDate = e.date; state.jOther = null; } else state.jOther = e.id; render(); } },
            h("small", { class: "item-sub" }, fmtDate.format(fromKey(e.date)) + (e.mood ? ", " + e.mood : ""), whoTag(e)),
            preview.length > 70 ? preview.slice(0, 70) + "…" : preview
          );
        })) : h("p", { class: "empty", text: "Yazdıkların burada birikecek." })]
      })
    )
  );
}
