function formField(id, label, type, extra) {
  return [h("label", { class: "lbl", for: id, text: label }), h("input", Object.assign({ class: "field", id, type, style: "width:100%" }, extra || {}))];
}

function shrinkImage(file, size) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      c.getContext("2d").drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
    img.src = url;
  });
}

function lastSeenCard() {
  const list = allProfiles.slice().sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  return card({ title: "Son görülme", icon: "users", span: "span-6", tint: "t-sage", body: [
    h("div", { class: "seen-list" }, list.map(p => h("div", { class: "seen-row" },
      avatar(p),
      h("div", { style: "flex:1;min-width:0" }, h("strong", {}, p.name, p.uid === me.uid ? " (sen)" : ""),
        h("div", { class: "tag" + (isOnline(p) || p.uid === me.uid ? " online" : ""), text: p.uid === me.uid ? "Çevrimiçi" : seenText(p) || "Henüz giriş yapmadı" })),
      p.disabled ? h("span", { class: "role off", text: "Devre dışı" }) : null
    )))
  ] });
}

function backupCard() {
  const msg = h("p", { class: "ok" });
  return card({ title: "Sitenin yedeği", icon: "book", span: "span-6", body: [
    h("p", { class: "empty", text: "Tüm profillerin, kayıtların, mesajların ve duyuruların yedeğini tek dosya olarak indirir." }),
    h("div", { class: "row", style: "margin-top:1rem" },
      h("button", { class: "btn primary", type: "button", text: "Tüm yedeği indir", onclick: async e => {
        const b = e.currentTarget;
        b.disabled = true; msg.className = "ok"; msg.textContent = "Hazırlanıyor…";
        try {
          const [items, msgs, siteDoc] = await Promise.all([itemsCol().get(), db.collection("messages").get(), db.collection("config").doc("site").get()]);
          const dump = {
            tarih: new Date().toISOString(),
            profiller: allProfiles.map(p => { const x = Object.assign({}, p); delete x.photo; return x; }),
            kayitlar: items.docs.map(d => Object.assign({ id: d.id }, d.data())),
            mesajlar: msgs.docs.map(d => Object.assign({ id: d.id }, d.data())),
            duyuru: siteDoc.exists ? siteDoc.data() : {}
          };
          const url = URL.createObjectURL(new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" }));
          const a = h("a", { href: url, download: "neriii-yedek-" + todayKey + ".json" });
          document.body.append(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          msg.textContent = dump.kayitlar.length + " kayıt ve " + dump.mesajlar.length + " mesaj indirildi.";
        } catch (ex) { msg.className = "err"; msg.textContent = "Yedek alınamadı, tekrar dene."; }
        b.disabled = false;
      } })),
    msg
  ] });
}

function guideSteps(steps) {
  return h("ol", { class: "guide" }, steps.map(([icon, html]) => h("li", {}, h("span", { class: "guide-ic", html: ico(icon, 18) }), h("span", { html }))));
}

function installGuide() {
  const p = platformInfo();
  let title, steps;
  if (p.ios && !p.safari) {
    title = "Önce Safari'de aç";
    steps = [["share", "Adres çubuğundaki <b>Paylaş</b> simgesine dokun. Görmüyorsan sayfayı <b>Safari</b>'de aç."],
      ["plus", "Listeyi kaydırıp <b>Ana Ekrana Ekle</b>'yi seç."], ["check", "Sağ üstteki <b>Ekle</b>'ye dokun."]];
  } else if (p.ios) {
    title = "iPhone'a Neriii'yi ekle";
    steps = [["share", "Ekranın altındaki <b>Paylaş</b> simgesine dokun."],
      ["plus", "Listeyi aşağı kaydırıp <b>Ana Ekrana Ekle</b>'yi seç."], ["check", "Sağ üstteki <b>Ekle</b>'ye dokun. Hayalet simgesi ana ekranında belirecek."]];
  } else if (p.android) {
    title = "Telefonuna Neriii'yi ekle";
    steps = [["menu", "Chrome'da sağ üstteki <b>⋮</b> menüsüne dokun."],
      ["download", "<b>Uygulamayı yükle</b> ya da <b>Ana ekrana ekle</b>'yi seç."], ["check", "<b>Yükle</b>'ye dokun. Hayalet simgesi ana ekranında belirecek."]];
  } else {
    title = "Bilgisayara Neriii'yi yükle";
    steps = [["download", "Adres çubuğunun sağındaki <b>yükle</b> simgesine tıkla."],
      ["menu", "Görmüyorsan tarayıcı menüsünden <b>Uygulamayı yükle</b>'yi seç."]];
  }
  return new Promise(resolve => {
    const root = $("dialog");
    const close = () => { root.classList.remove("show"); setTimeout(() => { root.hidden = true; root.replaceChildren(); resolve(); }, 160); };
    root.replaceChildren(
      h("div", { class: "dlg-back", onclick: close }),
      h("div", { class: "dlg dlg-wide", role: "dialog", "aria-modal": "true", "aria-labelledby": "instTitle" },
        h("img", { class: "dlg-app", src: "icons/icon.svg", alt: "", width: "64", height: "64" }),
        h("h2", { id: "instTitle", text: title }),
        guideSteps(steps),
        h("div", { class: "dlg-actions" }, h("button", { class: "btn primary", type: "button", text: "Tamam", onclick: close }))
      )
    );
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add("show"));
  });
}

async function installApp() {
  if (installPrompt) {
    installPrompt.prompt();
    try { await installPrompt.userChoice; } catch (e) {}
    installPrompt = null;
    refreshInstallUi();
    return;
  }
  installGuide();
}

function themeCard() {
  const cur = (data.theme || "auto");
  const opts = [["light", "Açık", "sun"], ["dark", "Koyu", "moon"], ["auto", "Otomatik", "star"]];
  const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  return h("div", {},
    h("p", { class: "empty", text: "Otomatik seçilirse telefonun ya da bilgisayarın gece moduna göre değişir." }),
    h("div", { class: "vis theme-switch", role: "group", "aria-label": "Görünüm" }, opts.map(([v, l, ic]) =>
      h("button", { type: "button", "aria-pressed": cur === v ? "true" : "false", onclick: () => { data.theme = v; save(); applyTheme(); render(); } },
        h("span", { html: ico(ic, 14), style: "display:grid" }), l))),
    h("div", { class: "install-box" },
      h("strong", { text: "Uygulama" }),
      standalone ? h("p", { class: "empty", text: "Neriii uygulama olarak açık ♡" })
        : h("div", {}, h("p", { class: "empty", text: "Neriii'yi ana ekranına ekle, tarayıcı çubuğu olmadan tam ekran açılsın." }),
            h("button", { class: "btn primary", type: "button", style: "margin-top:.7rem", onclick: installApp },
              h("span", { html: ico("download", 16), style: "display:inline-grid;vertical-align:-3px;margin-right:.4rem" }), "Uygulamayı indir"))
    )
  );
}

function timeRow(id, label, value, onSave, msg) {
  return h("div", { class: "row time-row" },
    h("label", { class: "lbl", for: id, style: "margin:0", text: label }),
    h("input", { class: "field", id, type: "time", value, style: "flex:none;width:8rem",
      onchange: async e => { if (!e.target.value) return; try { await onSave(e.target.value); msg.className = "ok"; msg.textContent = label + ": her gün " + e.target.value; } catch (ex) { msg.className = "err"; msg.textContent = "Kaydedilemedi, tekrar dene."; } } }));
}

function swVersion() {
  return new Promise(resolve => {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return resolve(0);
    const t = setTimeout(() => { navigator.serviceWorker.removeEventListener("message", on); resolve(0); }, 1500);
    const on = e => { if (e.data && e.data.type === "version") { clearTimeout(t); navigator.serviceWorker.removeEventListener("message", on); resolve(e.data.v || 0); } };
    navigator.serviceWorker.addEventListener("message", on);
    navigator.serviceWorker.controller.postMessage("version");
  });
}

async function runClosedTest(btn) {
  btn.disabled = true;
  btn.textContent = "Gönderiliyor…";
  try {
    const r = await pushApi("/test-push", { delay: 20 });
    if (!r || !r.tokens) { showToast("Kayıtlı cihaz yok", "Önce Bildirimleri aç'a basıp izin ver."); btn.disabled = false; btn.textContent = "Kapalıyken test et"; return; }
    await ask({ title: "Şimdi uygulamayı kapat 👻", text: "20 saniye içinde Neriii'yi tamamen kapat ya da ana ekrana dön ve telefonu kilitle. Bildirim kapalıyken gelecek.", ok: "Tamam", cancel: false, icon: "bell" });
  } catch (e) { showToast("Sunucuya ulaşılamadı", "Biraz sonra tekrar dene."); }
  btn.disabled = false;
  btn.textContent = "Kapalıyken test et";
}

async function runPushTest(cardEl) {
  const box = cardEl.querySelector(".push-test") || cardEl.appendChild(h("div", { class: "push-test" }));
  const rows = [];
  const draw = () => box.replaceChildren(h("strong", { text: "Bildirim kontrolü" }), h("ul", {}, rows.map(([ok, t]) => h("li", { class: ok === true ? "ok" : ok === false ? "err" : "" }, (ok === true ? "✓ " : ok === false ? "✗ " : "… ") + t))));
  const add = (ok, t) => { rows.push([ok, t]); draw(); };
  const pi = platformInfo();
  const perm = "Notification" in window ? Notification.permission : "yok";
  add(perm === "granted", "Bildirim izni: " + (perm === "granted" ? "verildi" : perm === "denied" ? "engellenmiş, telefon ayarlarından izin ver" : "henüz verilmedi"));
  if (pi.ios) add(pi.standalone, pi.standalone ? "Uygulama ana ekrandan açılmış" : "iPhone'da bildirim için Neriii'yi ana ekrandan açman gerekiyor");
  const swV = await swVersion();
  if (swV < 4 && "serviceWorker" in navigator) { try { (await navigator.serviceWorker.ready).update(); } catch (e) {} }
  add(swV >= 4, swV >= 4 ? "Arka plan servisi güncel (sürüm " + swV + ")" : swV ? "Arka plan servisi eski (sürüm " + swV + "), uygulamayı tamamen kapatıp yeniden aç" : "Arka plan servisi yanıt vermiyor, uygulamayı tamamen kapatıp yeniden aç");
  let r = "error";
  try { r = await registerPush(false); } catch (e) {}
  add(r === "ok", r === "ok" ? "Bu cihaz bildirim için kayıtlı" : r === "local" ? "Bu tarayıcı uzaktan bildirimi desteklemiyor (sadece uygulama açıkken gelir)" : "Cihaz kaydı yapılamadı (" + r + ")");
  if (!PUSH_API) { add(false, "Bildirim sunucusu adresi ayarlı değil"); return; }
  add(null, "Sunucu uyandırılıyor, bu 1 dakika kadar sürebilir…");
  try {
    const res = await pushApi("/test-push", {});
    rows.pop();
    add(true, "Sunucuya ulaşıldı");
    add(res.sent > 0, res.tokens ? res.sent + " / " + res.tokens + " cihaza gönderildi" + (res.errors && res.errors.length ? " (" + res.errors.join(", ") + ")" : "") : "Hesabında kayıtlı cihaz yok");
    if (res.sent > 0) add(null, "Birkaç saniye içinde bildirim gelmeli. Gelmezse telefonun bildirim ayarlarında Neriii'nin açık olduğundan emin ol.");
  } catch (e) {
    rows.pop();
    add(false, "Sunucuya ulaşılamadı (" + (e.message || "hata") + "). Render'da neriii-bildirim servisinin çalıştığını kontrol et.");
  }
}

function notifyCard() {
  const supported = "Notification" in window && "serviceWorker" in navigator;
  const perm = supported ? Notification.permission : "denied";
  const pi = platformInfo();
  const deviceOn = pushActive || (perm === "granted" && (() => { try { return !!localStorage.getItem("neriii-push-id"); } catch (e) { return false; } })());
  const msg = h("p", { class: "ok" });
  const sw = (label, sub, on, set) => h("label", { class: "switch-row" },
    h("span", {}, h("strong", { text: label }), sub ? h("small", { text: sub }) : null),
    h("input", { type: "checkbox", class: "switch", checked: !!on, onchange: async e => { try { await set(e.target.checked); msg.className = "ok"; msg.textContent = "Kaydedildi"; } catch (ex) { msg.className = "err"; msg.textContent = "Kaydedilemedi, tekrar dene."; } } }));

  if (pi.ios && !pi.standalone) {
    return h("div", {},
      h("p", { class: "empty", text: "iPhone'da bildirim alabilmek için önce Neriii'yi ana ekrana eklemen ve oradan açman gerekiyor." }),
      h("button", { class: "btn primary", type: "button", style: "margin-top:1rem", onclick: installApp },
        h("span", { html: ico("download", 16), style: "display:inline-grid;vertical-align:-3px;margin-right:.4rem" }), "Uygulamayı indir"));
  }
  if (!supported) return h("p", { class: "empty", text: "Bu tarayıcı bildirimleri desteklemiyor." });
  if (perm === "denied") return h("p", { class: "empty", text: "Bildirimler bu cihazda engellenmiş. Telefonun ya da tarayıcının ayarlarından Neriii için bildirimlere izin verip sayfayı yenile." });

  if (!deviceOn) {
    return h("div", {},
      h("p", { class: "empty", text: "Uygulama kapalıyken bile yeni mesajları ve her gün seçtiğin saatte günün olumlamasını bildirim olarak al." }),
      h("button", { class: "btn primary", type: "button", style: "margin-top:1rem", text: "Bildirimleri aç", onclick: async e => {
        e.currentTarget.disabled = true;
        let r = "error";
        try { r = await registerPush(true); } catch (ex) {}
        if (r === "ok" || r === "local") {
          await saveNotif({ msgOn: notifSettings.msgOn !== false, affOn: notifSettings.affOn !== false, affTime: notifSettings.affTime || "07:45", prayOn: notifSettings.prayOn !== false, prayTime: notifSettings.prayTime || "21:00" }).catch(() => {});
          notify("Bildirimler açık ♡", "Artık Neriii'den bildirim alacaksın.", "test");
        } else if (r !== "granted") showToast("Bildirimler açılamadı", r === "denied" ? "İzin verilmedi. Ayarlardan izin verip tekrar dene." : "Biraz sonra tekrar dene.");
        render();
      } }));
  }

  return h("div", {},
    sw("Mesaj bildirimleri", "Biri sana yazınca bildirim gelsin", notifSettings.msgOn !== false, v => saveNotif({ msgOn: v })),
    sw("Günün olumlaması", "Her gün seçtiğin saatte", notifSettings.affOn !== false, v => saveNotif({ affOn: v })),
    timeRow("affTime", "Olumlama saati", notifSettings.affTime || "07:45", v => saveNotif({ affTime: v, lastAff: "" }), msg),
    sw("Dua hatırlatması", "Her gün \"Duanı okumayı unutma\" bildirimi", notifSettings.prayOn !== false, v => saveNotif({ prayOn: v, prayTime: notifSettings.prayTime || "21:00" })),
    timeRow("prayTime", "Dua saati", notifSettings.prayTime || "21:00", v => saveNotif({ prayTime: v, prayOn: notifSettings.prayOn !== false, lastPray: "" }), msg),
    !PUSH_API ? h("p", { class: "empty", style: "margin-top:.8rem", text: "Bildirim sunucusu bağlanınca uygulama kapalıyken de bildirimler gelmeye başlayacak." }) : null,
    h("div", { class: "row", style: "margin-top:1rem" },
      h("button", { class: "btn", type: "button", text: "Bildirimi test et", onclick: e => runPushTest(e.currentTarget.closest(".card")) }),
      PUSH_API ? h("button", { class: "btn", type: "button", text: "Kapalıyken test et", onclick: e => runClosedTest(e.currentTarget) }) : null,
      h("button", { class: "btn danger", type: "button", text: "Bu cihazda kapat", onclick: async () => { await unregisterPush(); render(); } })),
    msg
  );
}

function renderSettings() {
  const cityMsg = h("p", { class: "ok" });
  const nameMsg = h("p", { class: "err" });
  const passMsg = h("p", { class: "err" });
  return h("div", {},
    pageHead("Ayarlar", "Giriş yaptığın profil: " + me.name + (me.isAdmin ? " (yönetici)" : "")),
    h("div", { class: "grid" },
      framePickerCard(),
      card({
        title: "Kullanıcı adım", icon: "users", span: "span-6",
        body: [h("form", { onsubmit: async e => {
          e.preventDefault();
          nameMsg.className = "err"; nameMsg.textContent = "";
          const v = $("myName").value.trim();
          const mine = allProfiles.find(x => x.uid === me.uid) || { uid: me.uid, name: me.name, slug: slugOf(me.name), email: me.email };
          if (v === mine.name) { nameMsg.textContent = "Bu zaten şu anki adın."; return; }
          try {
            await renameProfile(mine, v);
            nameMsg.className = "ok"; nameMsg.textContent = "Adın değiştirildi. Bundan sonra girişte \"" + v + "\" yaz.";
          } catch (ex) { nameMsg.textContent = ex.message && !ex.code ? ex.message : "Ad değiştirilemedi. Firestore kurallarının güncel olduğundan emin ol."; }
        } },
          h("p", { class: "empty", text: "Sitede görünen ve girişte yazdığın ad. Şifren değişmez." }),
          ...formField("myName", "Kullanıcı adın", "text", { value: me.name, autocomplete: "off" }),
          h("div", { class: "row", style: "margin-top:1.1rem" }, h("button", { class: "btn primary", type: "submit", text: "Adımı değiştir" })),
          nameMsg
        )]
      }),
      card({
        title: "Profil resmim", icon: "heart", span: "span-6", tint: "t-peach",
        body: [(() => {
          const mine = profileOf(me.uid) || { name: me.name, photo: me.photo };
          const msg = h("p", { class: "ok" });
          const fileIn = h("input", { type: "file", accept: "image/*", hidden: true, onchange: async e => {
            const f = e.target.files[0];
            e.target.value = "";
            if (!f) return;
            msg.className = "ok"; msg.textContent = "Yükleniyor…";
            try {
              const photo = await shrinkImage(f, 192);
              await db.collection("profiles").doc(me.uid).update({ photo });
              msg.textContent = "Profil resmin güncellendi.";
            } catch (ex) { msg.className = "err"; msg.textContent = "Resim yüklenemedi. Başka bir fotoğraf dene."; }
          } });
          return h("div", { class: "photo-row" },
            avatar(mine, "xl"),
            h("div", {},
              h("p", { class: "empty", text: "Bu resim mesajlarda, menüde ve profil listesinde görünür." }),
              h("div", { class: "row", style: "margin-top:.8rem" },
                h("button", { class: "btn primary", type: "button", text: mine.photo ? "Resmi değiştir" : "Resim seç", onclick: () => fileIn.click() }),
                mine.photo ? h("button", { class: "btn", type: "button", text: "Kaldır", onclick: () => db.collection("profiles").doc(me.uid).update({ photo: "" }).then(() => { msg.textContent = "Profil resmin kaldırıldı."; }) }) : null,
                fileIn),
              msg));
        })()]
      }),
      card({
        title: "Hava durumu", icon: "sun", span: "span-6",
        body: [h("form", { onsubmit: e => {
          e.preventDefault();
          const city = $("setCity").value.trim();
          if (city !== data.city) weatherCache = null;
          data.city = city;
          save(); cityMsg.textContent = "Kaydedildi";
        } },
          ...formField("setCity", "Şehrin (hava durumu için)", "text", { value: data.city, placeholder: "Örn. İstanbul" }),
          h("div", { class: "row", style: "margin-top:1.1rem" }, h("button", { class: "btn primary", type: "submit", text: "Kaydet" })),
          cityMsg
        )]
      }),
      card({
        title: "Şifremi değiştir", icon: "lock", span: "span-6",
        body: [h("form", { onsubmit: async e => {
          e.preventDefault();
          passMsg.className = "err"; passMsg.textContent = "";
          const cur = $("pwCur").value, nw = $("pwNew").value, nw2 = $("pwNew2").value;
          if (nw.length < 6) { passMsg.textContent = "Yeni şifre en az 6 karakter olmalı."; return; }
          if (nw !== nw2) { passMsg.textContent = "Yeni şifreler birbiriyle aynı değil."; return; }
          try {
            const user = auth.currentUser;
            await user.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(user.email, cur));
            await user.updatePassword(nw);
            e.target.reset();
            passMsg.className = "ok"; passMsg.textContent = "Şifren değiştirildi.";
          } catch (err) { passMsg.textContent = err && (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") ? "Şu anki şifren hatalı." : authError(err); }
        } },
          ...formField("pwCur", "Şu anki şifren", "password", { autocomplete: "current-password" }),
          ...formField("pwNew", "Yeni şifre", "password", { autocomplete: "new-password" }),
          ...formField("pwNew2", "Yeni şifre (tekrar)", "password", { autocomplete: "new-password" }),
          h("div", { class: "row", style: "margin-top:1.1rem" }, h("button", { class: "btn primary", type: "submit", text: "Şifreyi değiştir" })),
          passMsg
        )]
      }),
      card({
        title: "Görünüm ve uygulama", icon: "moon", span: "span-6", tint: "t-peach",
        body: [themeCard()]
      }),
      card({
        title: "Bildirimler", icon: "bell", span: "span-6", tint: "t-lilac",
        body: [notifyCard()]
      }),
      card({
        title: "Hesap", icon: "logout", span: "span-6",
        body: [
          h("p", { class: "empty", style: "margin-bottom:1rem", text: "Verilerin hesabında saklanır, hangi cihazdan girersen gir aynısını görürsün." }),
          h("div", { class: "row" },
            me.isAdmin ? h("button", { class: "btn", type: "button", text: "Verilerimi indir", onclick: () => {
              const mine = [...allItems().values()].filter(isMine);
              const url = URL.createObjectURL(new Blob([JSON.stringify({ profil: me.name, ayarlar: data, kayitlar: mine }, null, 2)], { type: "application/json" }));
              const a = h("a", { href: url, download: "neriii-" + slugOf(me.name) + "-" + todayKey + ".json" });
              document.body.append(a); a.click(); a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            } }) : null,
            h("button", { class: "btn primary", type: "button", text: "Çıkış yap", onclick: logout })
          )
        ]
      }),
      me.isAdmin ? card({
        title: "Yönetici", icon: "shield", span: "span-12", tint: "t-blush",
        body: [h("p", { class: "empty", text: "Profilleri, duyuruları ve paylaşılan içerikleri yönetici panelinden yönetebilirsin." }),
          h("button", { class: "btn primary", type: "button", style: "align-self:flex-start;margin-top:1rem", text: "Yönetici paneline git", onclick: () => go("admin") })]
      }) : null
    )
  );
}

function renderAdminLock() {
  const err = h("p", { class: "err" });
  return h("div", {},
    pageHead("Yönetici paneli", "Bu bölüm yönetici şifresiyle korunuyor."),
    h("section", { class: "card t-blush", style: "max-width:26rem" },
      h("div", { class: "card-head" }, h("span", { class: "ci", html: ico("lock", 22) }), h("h2", { text: "Yönetici girişi" })),
      h("form", { onsubmit: async e => {
        e.preventDefault();
        const v = $("adminPass").value;
        if (!v) { err.textContent = "Yönetici şifresini yaz."; return; }
        let ok = false;
        try { ok = (await sha256(v)) === (await currentAdminHash()); }
        catch (ex) { err.textContent = "Şifre kontrol edilemedi. Firestore kurallarının güncel olduğundan emin ol."; return; }
        if (!ok) { err.textContent = "Yönetici şifresi hatalı."; $("adminPass").value = ""; return; }
        adminUnlocked = true;
        try { sessionStorage.setItem("nerii-admin", "1"); } catch (ex) {}
        render();
      } },
        ...formField("adminPass", "Yönetici şifresi", "password", { autocomplete: "off" }),
        h("div", { class: "row", style: "margin-top:1.1rem" }, h("button", { class: "btn primary", type: "submit", text: "Kilidi aç" })),
        err
      )
    )
  );
}

function lockAdmin() {
  adminUnlocked = false;
  try { sessionStorage.removeItem("nerii-admin"); } catch (e) {}
}

const KIND_NAMES = { note: "Not", goal: "Hedef", habit: "Alışkanlık", plan: "Plan", shop: "Alışveriş", book: "Kitap", prayer: "Dua", memory: "Anı", magic: "Sihirli söz", aff: "Olumlama", journal: "Günlük" };
function itemSummary(i) {
  if (i.kind === "note") return (i.title || "Başlıksız not") + (i.body ? ": " + i.body : "");
  if (i.kind === "habit") return i.name;
  if (i.kind === "book") return i.title + (i.author ? ", " + i.author : "");
  if (i.kind === "memory") return (i.title || "Anı") + ((i.photos || []).length ? " (" + i.photos.length + " fotoğraf)" : "") + (i.text ? ": " + i.text : "");
  if (i.kind === "prayer") return (i.title || "Dua") + (i.text ? ": " + i.text : "");
  if (i.kind === "journal") return fmtDate.format(fromKey(i.date)) + (i.mood ? ", " + i.mood : "") + ((i.text || "").trim() ? ": " + i.text : "");
  if (i.kind === "plan") return i.text + ", " + fmtShort.format(fromKey(i.date));
  return i.text || "";
}

async function loadAllItems() {
  state.allItemsLoading = true;
  if (state.view === "admin") render();
  try {
    const snap = await itemsCol().get();
    state.allItemsAdmin = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  } catch (e) { state.allItemsAdmin = null; showToast("Kayıtlar yüklenemedi", "Firestore kurallarının güncel olduğundan emin ol."); }
  state.allItemsLoading = false;
  if (state.view === "admin") render();
}

function allItemsCard() {
  const all = state.allItemsAdmin;
  if (!all) {
    return card({ title: "Tüm kayıtlar", icon: "book", span: "span-12", body: [
      h("p", { class: "empty", text: "Herkesin eklediği tüm kayıtları, sadece kendine özel kaydettikleri dahil, buradan görebilir ve silebilirsin." }),
      h("button", { class: "btn primary", type: "button", style: "align-self:flex-start;margin-top:.9rem", text: state.allItemsLoading ? "Yükleniyor…" : "Kayıtları göster", onclick: loadAllItems })
    ] });
  }
  const fp = state.aiProfile || "", fk = state.aiKind || "", fv = state.aiVis || "";
  const rows = all.filter(i => (!fp || i.owner === fp) && (!fk || i.kind === fk) && (!fv || i.vis === fv)).sort((a, b) => (b.upd || b.at) - (a.upd || a.at));
  const owners = [...new Map(all.map(i => [i.owner, (profileOf(i.owner) || {}).name || i.ownerName])).entries()];
  const sel = (id, val, opts, set) => h("select", { id, "aria-label": "Filtre", onchange: e => { state[set] = e.target.value; render(); } }, opts.map(([v, l]) => h("option", { value: v, text: l, selected: v === val })));
  return card({ title: "Tüm kayıtlar (" + all.length + ")", icon: "book", span: "span-12", body: [
    h("div", { class: "row", style: "margin-bottom:.8rem" },
      sel("aiP", fp, [["", "Tüm profiller"]].concat(owners), "aiProfile"),
      sel("aiK", fk, [["", "Tüm türler"]].concat(Object.entries(KIND_NAMES)), "aiKind"),
      sel("aiV", fv, [["", "Tüm görünürlükler"], ["private", "Sadece kendine özel"], ["some", "Seçili kişiler"], ["public", "Herkese açık"]], "aiVis"),
      h("button", { class: "btn small", type: "button", text: "Yenile", onclick: loadAllItems })),
    rows.length ? h("ul", { class: "aff-list all-items" }, rows.slice(0, 300).map(i => h("li", {},
      h("div", { style: "flex:1;min-width:0" },
        h("p", { class: "clip", text: itemSummary(i) }),
        h("div", { class: "aff-meta" },
          h("span", { class: "who mine", text: KIND_NAMES[i.kind] || i.kind }),
          h("span", { text: (profileOf(i.owner) || {}).name || i.ownerName }),
          h("span", { class: "who" + (i.vis === "public" ? "" : " priv"), text: i.vis === "public" ? "Herkese açık" : i.vis === "some" ? (i.mode === "except" ? "Herkes, " + (i.except || []).map(nameOfUid).join(", ") + " hariç" : "Seçili: " + (i.viewers || []).map(nameOfUid).join(", ")) : "Sadece kendine özel" }),
          h("span", { text: fmtShort.format(new Date(i.upd || i.at)) }))
      ),
      h("button", { class: "icon-btn", type: "button", "aria-label": "Sil", html: ico("trash", 17), onclick: async () => {
        if (!(await ask({ title: "Bu kayıt silinsin mi?", text: itemSummary(i).slice(0, 120), ok: "Sil", danger: true }))) return;
        try { await itemsCol().doc(i.id).delete(); state.allItemsAdmin = state.allItemsAdmin.filter(x => x.id !== i.id); render(); }
        catch (e) { showToast("Silinemedi", "Firestore kurallarının güncel olduğundan emin ol."); }
      } })
    ))) : h("p", { class: "empty", text: "Bu filtreye uyan kayıt yok." }),
    rows.length > 300 ? h("p", { class: "empty", text: "İlk 300 kayıt gösteriliyor, filtreleri kullanarak daraltabilirsin." }) : null
  ] });
}

function renderAdmin() {
  if (!adminUnlocked) { state.focus = state.focus || "#adminPass"; return renderAdminLock(); }
  const newMsg = h("p", { class: "err" });
  const annMsg = h("p", { class: "ok" });
  const apMsg = h("p", { class: "err" });
  const sorted = allProfiles.slice().sort((a, b) => (isRootProfile(b) ? 1 : 0) - (isRootProfile(a) ? 1 : 0) || (a.at || 0) - (b.at || 0));
  const fail = () => showToast("Değişiklik kaydedilemedi", "Firestore kurallarının güncel olduğundan emin ol.");
  const profUpdate = (p, patch, okText) => db.collection("profiles").doc(p.uid).update(patch)
    .then(() => okText && showToast(okText)).catch(fail);

  const rows = sorted.map(p => {
    const self = p.uid === me.uid;
    const root = isRootProfile(p);
    const locked = self || (root && !me.isRoot);
    const role = p.disabled ? ["off", "Devre dışı"] : root ? ["admin", "Ana yönetici"] : p.role === "admin" ? ["admin", "Yönetici"] : ["", "Üye"];
    return h("div", { class: "admin-row" },
      avatar(p),
      h("div", { style: "min-width:0" },
        h("div", { class: "row", style: "gap:.5rem" },
          h("input", { class: "field name-edit", id: "pn-" + p.uid, type: "text", value: p.name, "aria-label": "Kullanıcı adı", disabled: root && !me.isRoot,
            onchange: async e => {
              const v = e.target.value.trim();
              if (!v || v === p.name) return;
              try { await renameProfile(p, v); showToast("Kullanıcı adı güncellendi", p.name + " artık girişte \"" + v + "\" yazacak."); }
              catch (ex) { e.target.value = p.name; showToast("Ad değiştirilemedi", ex.message && !ex.code ? ex.message : "Firestore kurallarının güncel olduğundan emin ol."); }
            } }),
          h("span", { class: "role " + role[0], text: role[1] })
        ),
        h("div", { class: "tag", style: "margin-top:.3rem", text: "Girişte yazacağı ad: " + p.name + (self ? " (sen)" : "") })
      ),
      locked ? h("span") : h("div", { class: "row", style: "gap:.4rem;justify-content:flex-end" },
        h("button", { class: "btn small", type: "button", text: p.role === "admin" ? "Yöneticilikten çıkar" : "Yönetici yap",
          onclick: () => profUpdate(p, { role: p.role === "admin" ? "user" : "admin" }, p.role === "admin" ? p.name + " artık üye" : p.name + " artık yönetici") }),
        h("button", { class: "btn small", type: "button", text: p.disabled ? "Etkinleştir" : "Devre dışı bırak",
          onclick: async () => { if (p.disabled || await ask({ title: p.name + " devre dışı bırakılsın mı?", text: "Bu kişi sen tekrar etkinleştirene kadar giriş yapamaz. Verileri silinmez.", ok: "Devre dışı bırak", danger: true, icon: "lock" })) profUpdate(p, { disabled: !p.disabled }); } }),
        h("button", { class: "btn small danger", type: "button", text: "Sil",
          onclick: async () => {
            if (!(await ask({ title: p.name + " profili silinsin mi?", text: "Bu kişi bir daha giriş yapamaz. Bu işlem geri alınamaz.", ok: "Profili sil", danger: true }))) return;
            try {
              const batch = db.batch();
              batch.delete(db.collection("profiles").doc(p.uid));
              if (p.slug) {
                const lg = await db.collection("logins").doc(p.slug).get();
                if (lg.exists && lg.data().uid === p.uid) batch.delete(db.collection("logins").doc(p.slug));
              }
              await batch.commit();
              showToast(p.name + " profili silindi");
            } catch (ex) { fail(); }
          } })
      )
    );
  });


  return h("div", {},
    h("div", { class: "row", style: "justify-content:space-between;align-items:flex-start" },
      pageHead("Yönetici paneli", "Profilleri, duyuruları ve paylaşılan içerikleri buradan yönet."),
      h("button", { class: "btn", type: "button", onclick: () => { lockAdmin(); render(); } }, h("span", { html: ico("lock", 16), style: "display:inline-grid;vertical-align:-3px;margin-right:.35rem" }), "Kilitle")),
    h("div", { class: "grid" },
      card({ title: "Profiller (" + sorted.length + ")", icon: "users", span: "span-8", body: [h("div", {}, rows)] }),
      card({
        title: "Yeni profil ekle", icon: "plus", span: "span-4", tint: "t-blush",
        body: [h("form", { onsubmit: async e => {
          e.preventDefault();
          newMsg.className = "err"; newMsg.textContent = "";
          const name = $("npName").value.trim(), pw = $("npPass").value, pw2 = $("npPass2").value;
          if (!slugOf(name) || name.includes("@")) { newMsg.textContent = "Geçerli bir kullanıcı adı yaz."; return; }
          if (allProfiles.some(x => x.slug === slugOf(name))) { newMsg.textContent = "Bu kullanıcı adı başka bir profilde kullanılıyor."; return; }
          if (pw.length < 6) { newMsg.textContent = "Şifre en az 6 karakter olmalı."; return; }
          if (pw !== pw2) { newMsg.textContent = "Şifreler birbiriyle aynı değil."; return; }
          const btn = e.target.querySelector("button[type=submit]");
          btn.disabled = true;
          try {
            const sec = firebase.apps.find(x => x.name === "ikincil") || firebase.initializeApp(firebaseConfig, "ikincil");
            const taken = await db.collection("logins").doc(slugOf(name)).get();
            if (taken.exists) { newMsg.textContent = "Bu kullanıcı adı daha önce alınmış."; btn.disabled = false; return; }
            const email = slugOf(name) + "@nerii.app";
            const cred = await sec.auth().createUserWithEmailAndPassword(email, pw);
            const batch = db.batch();
            batch.set(db.collection("profiles").doc(cred.user.uid), { name, slug: slugOf(name), role: "user", email, at: Date.now() });
            batch.set(db.collection("logins").doc(slugOf(name)), { uid: cred.user.uid, email, at: Date.now() });
            await batch.commit();
            await sec.auth().signOut();
            e.target.reset();
            newMsg.className = "ok"; newMsg.textContent = name + " profili oluşturuldu. Giriş ekranında \"" + name + "\" ve bu şifreyle girebilir.";
          } catch (err) { newMsg.textContent = authError(err); }
          btn.disabled = false;
        } },
          ...formField("npName", "Kullanıcı adı", "text", { autocomplete: "off" }),
          ...formField("npPass", "Şifre", "password", { autocomplete: "new-password" }),
          ...formField("npPass2", "Şifre (tekrar)", "password", { autocomplete: "new-password" }),
          h("div", { class: "row", style: "margin-top:1.1rem" }, h("button", { class: "btn primary", type: "submit", text: "Profili oluştur" })),
          newMsg
        )]
      }),
      card({
        title: "Duyuru", icon: "bell", span: "span-6", tint: "t-peach",
        body: [
          h("p", { class: "empty", text: "Yazdığın duyuru herkesin ana sayfasında en üstte görünür." }),
          h("textarea", { id: "annText", rows: "4", style: "margin-top:.75rem", placeholder: "Örn. Bu hafta herkes 3 kitap hedefini eklesin ♡" }, site.announcement || ""),
          PUSH_API ? h("label", { class: "check-row" }, h("input", { type: "checkbox", id: "annPush", checked: true }), h("span", { text: "Herkese bildirim olarak da gönder" })) : null,
          h("div", { class: "row", style: "margin-top:.75rem" },
            h("button", { class: "btn primary", type: "button", text: "Yayınla", onclick: () => {
              const text = $("annText").value.trim();
              const push = $("annPush") && $("annPush").checked;
              db.collection("config").doc("site").set({ announcement: text, byName: me.name, at: Date.now() }, { merge: true })
                .then(async () => {
                  annMsg.textContent = text ? "Duyuru yayında." : "Duyuru kaldırıldı.";
                  if (text && push) { try { const r = await pushApi("/notify-announcement", {}); annMsg.textContent = "Duyuru yayında, " + ((r && r.sent) || 0) + " cihaza bildirim gitti."; } catch (e) { annMsg.textContent = "Duyuru yayında ama bildirim gönderilemedi."; } }
                })
                .catch(() => showToast("Duyuru kaydedilemedi", "Firestore kurallarının güncel olduğundan emin ol."));
            } }),
            site.announcement ? h("button", { class: "btn", type: "button", text: "Duyuruyu kaldır", onclick: () => {
              db.collection("config").doc("site").set({ announcement: "", at: Date.now() }, { merge: true }).then(() => { annMsg.textContent = "Duyuru kaldırıldı."; });
            } }) : null
          ),
          annMsg
        ]
      }),
      lastSeenCard(),
      card({
        title: "Yönetici şifresi", icon: "lock", span: "span-6",
        body: [h("form", { onsubmit: async e => {
          e.preventDefault();
          apMsg.className = "err"; apMsg.textContent = "";
          const cur = $("apCur").value, nw = $("apNew").value, nw2 = $("apNew2").value;
          if (nw.length < 4) { apMsg.textContent = "Yeni şifre en az 4 karakter olmalı."; return; }
          if (nw !== nw2) { apMsg.textContent = "Yeni şifreler birbiriyle aynı değil."; return; }
          try {
            if ((await sha256(cur)) !== (await currentAdminHash())) { apMsg.textContent = "Şu anki yönetici şifresi hatalı."; return; }
            await db.collection("config").doc("admin").set({ passHash: await sha256(nw), at: Date.now() });
            e.target.reset();
            apMsg.className = "ok"; apMsg.textContent = "Yönetici şifresi değiştirildi. Bundan sonra yeni şifreyle açılır.";
          } catch (ex) { apMsg.textContent = "Şifre kaydedilemedi. Firestore kurallarının güncel olduğundan emin ol."; }
        } },
          h("p", { class: "empty", text: "Yönetici panelini açarken sorulan şifre. Giriş şifrenden ayrıdır." }),
          ...formField("apCur", "Şu anki yönetici şifresi", "password", { autocomplete: "off" }),
          ...formField("apNew", "Yeni yönetici şifresi", "password", { autocomplete: "off" }),
          ...formField("apNew2", "Yeni yönetici şifresi (tekrar)", "password", { autocomplete: "off" }),
          h("div", { class: "row", style: "margin-top:1.1rem" }, h("button", { class: "btn primary", type: "submit", text: "Yönetici şifresini değiştir" })),
          apMsg
        )]
      }),
      backupCard(),
      adminChatsCard(),
      allItemsCard()
    )
  );
}
