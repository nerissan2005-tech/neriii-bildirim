function resizeImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * scale), hh = Math.round(img.naturalHeight * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = hh;
      c.getContext("2d").drawImage(img, 0, 0, w, hh);
      URL.revokeObjectURL(url);
      let q = quality || .75, out = c.toDataURL("image/jpeg", q);
      while (out.length > 280000 && q > .4) { q -= .1; out = c.toDataURL("image/jpeg", q); }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
    img.src = url;
  });
}

function openViewer(photos, start) {
  const root = $("dialog");
  let i = start || 0;
  const imgEl = h("img", { class: "viewer-img", alt: "" });
  const count = h("span", { class: "viewer-count" });
  const show = () => { imgEl.src = photos[i]; count.textContent = photos.length > 1 ? (i + 1) + " / " + photos.length : ""; };
  const close = () => { root.classList.remove("show"); document.removeEventListener("keydown", onKey, true); setTimeout(() => { root.hidden = true; root.replaceChildren(); }, 160); };
  const step = d => { i = (i + d + photos.length) % photos.length; show(); };
  const onKey = e => { if (e.key === "Escape") close(); if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); };
  let sx = null;
  root.replaceChildren(
    h("div", { class: "dlg-back viewer-back", onclick: close }),
    h("div", { class: "viewer", ontouchstart: e => { sx = e.touches[0].clientX; }, ontouchend: e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40 && photos.length > 1) step(dx < 0 ? 1 : -1); sx = null; } },
      imgEl,
      photos.length > 1 ? h("button", { class: "viewer-nav prev", type: "button", "aria-label": "Önceki", html: ico("left", 22), onclick: () => step(-1) }) : null,
      photos.length > 1 ? h("button", { class: "viewer-nav next", type: "button", "aria-label": "Sonraki", html: ico("right", 22), onclick: () => step(1) }) : null,
      h("button", { class: "viewer-close", type: "button", "aria-label": "Kapat", html: ico("x", 22), onclick: close }),
      count)
  );
  show();
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add("show"));
  document.addEventListener("keydown", onKey, true);
}

function memoryDialog(m) {
  const root = $("dialog");
  const close = () => { root.classList.remove("show"); document.removeEventListener("keydown", onKey, true); setTimeout(() => { root.hidden = true; root.replaceChildren(); }, 160); };
  const onKey = e => { if (e.key === "Escape") close(); };
  const photos = m.photos || [];
  root.replaceChildren(
    h("div", { class: "dlg-back", onclick: close }),
    h("div", { class: "dlg memory-dlg", role: "dialog", "aria-modal": "true", "aria-label": m.title || "Anı" },
      photos.length ? h("div", { class: "memory-photos n" + Math.min(photos.length, 3) }, photos.map((p, i) =>
        h("button", { type: "button", class: "mp", style: "background-image:url(\"" + p + "\")", "aria-label": "Fotoğrafı büyüt", onclick: () => { close(); setTimeout(() => openViewer(photos, i), 180); } }))) : null,
      h("div", { class: "memory-body" },
        h("div", { class: "row", style: "gap:.5rem;justify-content:space-between" },
          h("span", { class: "tag", text: fmtLong.format(fromKey(m.date || todayKey)) + (m.place ? ", " + m.place : "") }),
          whoTag(m)),
        h("h2", { text: m.title || "Anı" }),
        m.text ? h("p", { class: "memory-text", text: m.text }) : null,
        h("div", { class: "dlg-actions" },
          canDel(m) ? h("button", { class: "btn danger", type: "button", text: "Anıyı sil", onclick: async () => { close(); setTimeout(() => delItem(m, "Bu anı silinsin mi?"), 200); } }) : null,
          isMine(m) ? h("button", { class: "btn", type: "button", text: "Kimler görsün", onclick: () => { close(); setTimeout(() => audDialog(m), 200); } }) : null,
          h("button", { class: "btn primary", type: "button", text: "Kapat", onclick: close }))
      )
    )
  );
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add("show"));
  document.addEventListener("keydown", onKey, true);
}

function renderMemories() {
  const all = listOf("memory").sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.at || 0) - (a.at || 0));
  state.memPhotos = state.memPhotos || [];
  const msg = h("p", { class: "err" });
  const thumbs = h("div", { class: "mem-thumbs" },
    state.memPhotos.map((p, i) => h("div", { class: "mem-thumb", style: "background-image:url(\"" + p + "\")" },
      h("button", { type: "button", "aria-label": "Fotoğrafı kaldır", html: ico("x", 14), onclick: () => { state.memPhotos.splice(i, 1); render(); } }))),
    state.memPhotos.length < 3 ? h("label", { class: "mem-add" },
      h("span", { html: ico("camera", 22), style: "display:grid" }), h("small", { text: "Fotoğraf ekle" }),
      h("input", { type: "file", accept: "image/*", multiple: true, hidden: true, onchange: async e => {
        const files = [...e.target.files].slice(0, 3 - state.memPhotos.length);
        e.target.value = "";
        for (const f of files) { try { state.memPhotos.push(await resizeImage(f, 1100, .75)); } catch (ex) {} }
        render();
      } })) : null
  );
  const form = h("form", { onsubmit: e => {
    e.preventDefault();
    const title = $("memTitle").value.trim(), text = $("memText").value.trim();
    if (!title && !text && !state.memPhotos.length) { msg.textContent = "Bir başlık, birkaç cümle ya da fotoğraf ekle."; return; }
    petAward("ani", 15);
    addItem("memory", { title: title || "Güzel bir an", text, date: $("memDate").value || todayKey, place: $("memPlace").value.trim(), photos: state.memPhotos.slice() }, getVis("memory"));
    state.memPhotos = [];
    $("memTitle").value = ""; $("memText").value = ""; $("memPlace").value = "";
    showToast("Anı kaydedildi ♡");
    render();
  } },
    h("div", { class: "row" },
      h("input", { class: "field", id: "memTitle", type: "text", placeholder: "Başlık, örn. Sahilde gün batımı", "aria-label": "Başlık", autocomplete: "off" }),
      h("input", { class: "field", id: "memDate", type: "date", value: todayKey, max: todayKey, style: "flex:none", "aria-label": "Tarih" })),
    h("input", { class: "field", id: "memPlace", type: "text", placeholder: "Yer (isteğe bağlı)", "aria-label": "Yer", autocomplete: "off", style: "width:100%;margin-top:.6rem" }),
    h("textarea", { id: "memText", rows: "3", style: "margin-top:.6rem", placeholder: "Bu anda neler oldu, ne hissettin?", "aria-label": "Anı" }),
    thumbs,
    h("div", { class: "row", style: "justify-content:space-between;align-items:flex-start;margin-top:.4rem" },
      visPicker("memory"),
      h("button", { class: "btn primary", type: "submit", style: "margin-top:.5rem", text: "Anıyı kaydet" })),
    msg
  );
  const grid = all.length ? h("div", { class: "memories" }, all.map((m, idx) => {
    const p = (m.photos || [])[0];
    return h("button", { class: "memory-card", type: "button", style: "--tilt:" + ((idx % 5) - 2) * .8 + "deg", onclick: () => memoryDialog(m) },
      h("div", { class: "memory-pic" + (p ? "" : " empty"), style: p ? "background-image:url(\"" + p + "\")" : null },
        p ? null : h("span", { html: ico("heart", 30), style: "display:grid" }),
        (m.photos || []).length > 1 ? h("span", { class: "memory-more", text: "+" + ((m.photos || []).length - 1) }) : null),
      h("div", { class: "memory-cap" },
        h("strong", { text: m.title || "Anı" }),
        h("span", { class: "item-sub" }, fmtShort.format(fromKey(m.date || todayKey)), whoTag(m)))
    );
  })) : h("p", { class: "empty", text: "Henüz anı yok. İlk güzel anını sen ekle ♡" });
  return h("div", {},
    pageHead("Anı Defteri", "Fotoğraflı küçük anılar biriktir, istersen sadece seçtiğin kişilerle paylaş."),
    h("section", { class: "card t-peach", style: "margin-bottom:1.5rem" }, doodle("leaf"), form),
    grid
  );
}

function magicPool() {
  const custom = listOf("magic").filter(m => !isMine(m) || m.vis === "private");
  const pool = MAGIC_WORDS.map(t => ({ text: t }));
  custom.forEach(m => { for (let i = 0; i < 4; i++) pool.push({ text: m.text, from: isMine(m) ? "" : m.ownerName, id: m.id }); });
  return pool;
}

function sendMagicTo(text) {
  const root = $("dialog");
  const close = () => { root.classList.remove("show"); setTimeout(() => { root.hidden = true; root.replaceChildren(); }, 160); };
  root.replaceChildren(
    h("div", { class: "dlg-back", onclick: close }),
    h("div", { class: "dlg dlg-wide", role: "dialog", "aria-modal": "true", "aria-label": "Kime gönderelim" },
      h("span", { class: "dlg-ic", html: ico("gift", 26) }),
      h("h2", { text: "Bu sözü kime gönderelim?" }),
      h("p", { class: "clip", text: "✨ " + text }),
      h("div", { class: "aud-people", style: "justify-content:center;margin:.6rem 0 .2rem" }, profiles.map(p =>
        h("button", { type: "button", class: "person", onclick: async () => {
          close();
          try { await sendQuickMessage(p.uid, { text: "✨ " + text }); showToast("Sihirli söz " + p.name + " adlı kişiye gönderildi ✨"); }
          catch (e) { showToast("Gönderilemedi", "İnternet bağlantını kontrol et."); }
        } }, avatar(p), h("span", { text: p.name })))),
      h("div", { class: "dlg-actions" }, h("button", { class: "btn", type: "button", text: "Vazgeç", onclick: close }))
    )
  );
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add("show"));
}

function renderMagic() {
  const pool = magicPool();
  const cur = state.magicWord;
  const stage = h("div", { class: "magic-stage" + (cur ? " opened" : "") });
  const box = h("button", { class: "magic-box", type: "button", "aria-label": "Sihirli kutuya dokun", onclick: () => {
    if (stage.classList.contains("busy")) return;
    stage.classList.add("busy", "shake");
    let pick;
    do { pick = pool[Math.floor(Math.random() * pool.length)]; } while (pool.length > 1 && cur && pick.text === cur.text);
    setTimeout(() => {
      stage.classList.remove("shake");
      stage.classList.add("burst");
      const sp = stage.querySelector(".sparkles");
      sp.replaceChildren(...Array.from({ length: 26 }, (_, i) => {
        const a = (i / 26) * Math.PI * 2, r = 110 + Math.random() * 90;
        return h("i", { style: "--x:" + Math.cos(a) * r + "px;--y:" + Math.sin(a) * r + "px;--d:" + (Math.random() * .25) + "s;--s:" + (.6 + Math.random() * .9), text: ["✨", "♡", "★", "✦"][i % 4] });
      }));
      if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {}
      setTimeout(() => { state.magicWord = pick; data.magicCount = (data.magicCount || 0) + 1; save(); petAward("sihir", 10); render(); }, 650);
    }, 650);
  } },
    h("span", { class: "magic-glow" }),
    h("span", { class: "magic-gift", html: '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="mgB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C46A8A"/><stop offset="1" stop-color="#5B2E4F"/></linearGradient><linearGradient id="mgL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E58FB0"/><stop offset="1" stop-color="#9B4A78"/></linearGradient></defs><rect x="22" y="52" width="76" height="56" rx="8" fill="url(#mgB)"/><rect class="mg-lid" x="16" y="38" width="88" height="20" rx="6" fill="url(#mgL)"/><rect x="54" y="38" width="12" height="70" fill="#F6C99F"/><path class="mg-bow" d="M60 38c-10-16-30-14-26-3 3 7 18 5 26 3zm0 0c10-16 30-14 26-3-3 7-18 5-26 3z" fill="#F6C99F"/><circle cx="60" cy="38" r="5" fill="#F0A43A"/></svg>' }),
    h("span", { class: "sparkles" })
  );
  stage.append(box);
  const wordCard = cur ? h("div", { class: "magic-word" },
    cur.from ? h("span", { class: "magic-from", text: "✨ " + cur.from + "'den sana" }) : null,
    h("p", { text: cur.text }),
    h("div", { class: "row", style: "justify-content:center;margin-top:1rem" },
      h("button", { class: "btn primary", type: "button", text: "Bir daha ✨", onclick: () => box.click() }),
      profiles.length ? h("button", { class: "btn", type: "button", text: "Birine gönder", onclick: () => sendMagicTo(cur.text) }) : null)
  ) : h("p", { class: "magic-hint", text: "Kutuya dokun, sana bir sihirli söz çıksın ✨" });

  const myWords = listOf("magic").filter(isMine);
  const form = h("form", { onsubmit: e => {
    e.preventDefault();
    const t = $("magicText").value.trim();
    if (!t) return;
    addItem("magic", { text: t }, getVis("magic"));
    $("magicText").value = "";
    showToast("Sihirli söz kutuya eklendi ✨");
  } },
    h("p", { class: "empty", text: "Kendi sözünü ekle. Kişi seçersen sadece o kişinin kutusundan çıkar; sürpriz olur ♡" }),
    h("div", { class: "row", style: "margin-top:.6rem" },
      h("input", { class: "field", id: "magicText", type: "text", placeholder: "Örn. İyi ki hayatımdasın", "aria-label": "Sihirli söz", autocomplete: "off" }),
      h("button", { class: "btn primary", type: "submit", text: "Ekle" })),
    visPicker("magic"),
    myWords.length ? h("ul", { class: "checks", style: "margin-top:.8rem" }, myWords.map(w => h("li", {},
      h("span", { style: "flex:1;padding:.4rem 0", text: w.text }), whoTag(w), visBtn(w), delBtn(w, w.text)))) : null
  );

  return h("div", {},
    pageHead("Sihirli Kutu", "Dokun, kalbine iyi gelecek bir söz çıksın."),
    h("section", { class: "card magic-card" }, stage, wordCard),
    h("div", { class: "grid", style: "margin-top:1.25rem" }, card({ title: "Kutuya söz ekle", icon: "heart", span: "span-12", tint: "t-lilac", body: [form] }))
  );
}
