const ICONS = {
  mail: "M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM3.5 7l8.5 6 8.5-6",
  paw: "M4.2 10.5a1.8 2.2 0 1 0 3.6 0a1.8 2.2 0 1 0-3.6 0zM16.2 10.5a1.8 2.2 0 1 0 3.6 0a1.8 2.2 0 1 0-3.6 0zM7.7 6.5a1.8 2.2 0 1 0 3.6 0a1.8 2.2 0 1 0-3.6 0zM12.7 6.5a1.8 2.2 0 1 0 3.6 0a1.8 2.2 0 1 0-3.6 0zM12 12.5c-3 0-5.5 3.2-5.5 5.3 0 1.5 1.1 2.4 2.5 2.4 1.2 0 2-.6 3-.6s1.8.6 3 .6c1.4 0 2.5-.9 2.5-2.4 0-2.1-2.5-5.3-5.5-5.3z",
  ghost: "M6 20v-9a6 6 0 0 1 12 0v9l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5zM10 10h.01M14 10h.01",
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  note: "M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h4",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
  repeat: "M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3",
  calendar: "M4 5h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 10h18M8 3v4M16 3v4",
  heart: "M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c-2 4.5-9 9-9 9z",
  cart: "M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2M9 20.5h.01M17 20.5h.01",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M19 19v2H6",
  settings: "M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4",
  menu: "M4 6h16M4 12h16M4 18h16",
  plus: "M12 5v14M5 12h14",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  left: "M15 18l-6-6 6-6",
  right: "M9 18l6-6-6-6",
  chat: "M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1zM8 10h8M8 13h5",
  logout: "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3",
  send: "M4 12l16-8-6 16-2.5-6.5z",
  x: "M6 6l12 12M18 6L6 18",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14c2 .7 3 2.8 3 6",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  bell: "M6 9a6 6 0 0 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9zM10 20.5a2 2 0 0 0 4 0",
  star: "M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z",
  camera: "M4 8a2 2 0 0 1 2-2h2l1.5-2h5L16 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  gift: "M4 11h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1zM3 7h18v4H3zM12 7v14M12 7S10.5 3 8 3a2 2 0 0 0 0 4M12 7s1.5-4 4-4a2 2 0 0 1 0 4",
  mic: "M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6",
  image: "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 16l5-5 4 4 3-3 6 6M15.5 9.5h.01",
  stop: "M7 7h10v10H7z",
  download: "M12 4v11M7 10l5 5 5-5M5 20h14",
  check: "M5 12.5l4.5 4.5L19 7.5",
  share: "M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1",
  wallet: "M4 7h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12v3M16 13.5h.01",
  moon: "M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
};
const ico = (n, s) => '<svg viewBox="0 0 24 24" width="' + (s || 20) + '" height="' + (s || 20) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[n] + '"/></svg>';
const DOODLES = {
  leaf: "M12 60 C 24 44 34 30 52 6 M24 44 c -10 -2 -14 -10 -12 -18 c 8 2 12 8 12 18 M31 34 c 8 -6 16 -6 20 0 c -6 6 -14 6 -20 0 M39 23 c -8 -4 -10 -12 -6 -18 c 6 4 8 10 6 18",
  flag: "M2 60 L 22 28 L 31 40 L 42 22 L 62 60 M42 22 V 4 L 54 8 L 42 12 M14 60 c 6 -4 10 -4 14 0",
  basket: "M6 28 H58 L52 58 H12 Z M18 28 L28 8 M46 28 L36 8 M20 36 V50 M32 36 V50 M44 36 V50",
  sprout: "M32 60 V30 M32 40 C 20 40 12 32 12 20 C 24 20 32 28 32 40 M32 30 C 32 18 40 10 52 10 C 52 22 44 30 32 30",
  moon: "M40 8 A 24 24 0 1 0 56 44 A 20 20 0 1 1 40 8 Z M14 14 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"
};
const doodle = n => h("span", { class: "doodle", "aria-hidden": "true", html: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="' + DOODLES[n] + '"/></svg>' });

const VIEWS = [
  ["home", "Ana Sayfa", "home"],
  ["messages", "Mesajlar", "chat"],
  ["affirm", "Olumlamalar", "star"],
  ["letters", "Birbirimize", "mail"],
  ["notes", "Notlar & Hedefler", "note"],
  ["goals", "Hedefler", "target"],
  ["habits", "Alışkanlıklar", "repeat"],
  ["calendar", "Takvim & Alışkanlık", "calendar"],
  ["journal", "Günlük", "heart"],
  ["shopping", "Ödemelerim ve Alışveriş", "wallet"],
  ["prayers", "Dualarımız", "moon"],
  ["pet", "Petim", "paw"],
  ["memories", "Anı Defteri", "camera"],
  ["magic", "Sihirli Kutu", "gift"],
  ["settings", "Ayarlar", "settings"],
  ["admin", "Yönetici", "shield"]
];
const TAB_MAIN = ["home", "messages", "affirm", "journal"];
const TILES = [
  ["pet", "Petim", "Minik tavşanın ya da ayıcığın seninle büyüsün", "paw", "#D9779A"],
  ["journal", "Duygu Günlüğü", "Bugünün ruh hali ve şükran listesi", "heart", "#C46A8A"],
  ["prayers", "Dualarımız", "Dualarını yaz, birlikte amin deyin", "moon", "#6F8F78"],
  ["magic", "Sihirli Kutu", "Dokun, kalbine iyi gelen bir söz çıksın", "gift", "#E0975A"],
  ["memories", "Anı Defteri", "Fotoğraflı güzel anılar biriktir", "camera", "#4F7FA3"],
  ["letters", "Birbirimize", "Notlar ve sürpriz mektuplar bırak", "mail", "#C46A8A"]
];

let installPrompt = null;
function platformInfo() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return {
    ios,
    android: /Android/.test(ua),
    safari: ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA/.test(ua),
    standalone: window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true
  };
}
function refreshInstallUi() {
  const p = platformInfo();
  const show = !p.standalone && (p.ios || p.android || !!installPrompt);
  document.querySelectorAll("[data-install]").forEach(el => { el.hidden = !show; });
}
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; refreshInstallUi(); });
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  refreshInstallUi();
  if (typeof showToast === "function") showToast("Neriii yüklendi ♡", "Artık ana ekranından açabilirsin.");
});
