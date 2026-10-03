const FRAMES = [
  ["", "Çerçevesiz"], ["pastel", "Pastel"], ["rainbow", "Gökkuşağı"], ["hearts", "Kalpler"], ["flowers", "Çiçek tacı"],
  ["stars", "Yıldızlar"], ["moon", "Ay ve yıldız"], ["bow", "Fiyonk"], ["crown", "Taç"], ["cat", "Kedi kulakları"],
  ["bunny", "Tavşan kulakları"], ["bear", "Ayıcık"], ["ghost", "Hayalet dostu"]
];
const frameCls = f => f && FRAMES.some(x => x[0] === f) ? " frm fr-" + f : "";

const PET_SPECIES = { bunny: "Tavşan", bear: "Ayıcık" };
const PET_FOOD = { bunny: ["🥕", "havuç"], bear: ["🍯", "bal"] };
const PET_COLORS = {
  bunny: [["#FFFDFB", "Beyaz"], ["#FFD9E6", "Pembe"], ["#FFF0D2", "Krem"], ["#DCD8E6", "Gri"], ["#E6D9FF", "Lila"]],
  bear: [["#C08A62", "Kahve"], ["#E6AE5C", "Bal"], ["#F2D6B5", "Krem"], ["#F6C9D3", "Pembe"], ["#F7F5F2", "Kutup"]]
};
const PET_EFFECTS = [["", "Yok"], ["💗", "Kalpler"], ["⭐", "Yıldızlar"], ["✨", "Pırıltı"], ["🌸", "Çiçekler"], ["💧", "Gözyaşı"], ["🎵", "Notalar"], ["🦋", "Kelebek"], ["🫧", "Baloncuk"], ["❄️", "Kar"]];
const PET_SHOP = [
  ["bow", "Fiyonk", "head", 30], ["flower", "Çiçek tacı", "head", 60], ["party", "Şapka", "head", 80], ["halo", "Hale", "head", 150], ["crown", "Taç", "head", 220],
  ["hglasses", "Gözlük", "face", 70], ["sun", "Güneş gözlüğü", "face", 90],
  ["bowtie", "Papyon", "neck", 40], ["scarf", "Atkı", "neck", 60], ["necklace", "Kalp kolye", "neck", 100],
  ["wings", "Melek kanatları", "back", 250]
];
const PET_SLOTS = { head: "Baş", face: "Yüz", neck: "Boyun", back: "Sırt" };
const PET_STAGES = [[0, "Bebek", .58], [100, "Minik", .72], [300, "Genç", .86], [700, "Büyük", 1]];
const DAILY = [["olumlama", "Günün olumlamasını oku"], ["dua", "Bir dua ya da sure oku"], ["gunluk", "Günlüğüne yaz"], ["besle", "Petini besle"], ["sev", "Petini sev"], ["sihir", "Sihirli Kutu'yu aç"], ["mesaj", "Birine mesaj yaz"]];
const PET_TASKS = [
  ["olumlama", "Günün olumlaması", 10, 10], ["dua", "Dua ve sureler", 10, 30], ["gunluk", "Günlük", 20, 20],
  ["besle", "Besle", 10, 30], ["sev", "Sev", 5, 15], ["sihir", "Sihirli Kutu", 10, 10], ["mesaj", "Mesaj", 2, 10],
  ["gorev", "Plan işleri", 5, 20], ["aliskanlik", "Alışkanlıklar", 5, 20], ["uyku", "Güzel uyku", 15, 15], ["ani", "Anı", 15, 15], ["kalp", "Arkadaş sevgisi", 5, 50], ["bonus", "Tüm görevler bonusu", 30, 30]
];
const EMO_TEXT = { happy: "mutlu 😊", love: "çok mutlu 🥰", sad: "üzgün 🥺", sleepy: "uykulu 😴", hungry: "aç ", asleep: "mışıl mışıl uyuyor 💤" };
let petState = null;
let petSaveTimer = null;
let petRenderTimer = null;

const petStage = xp => { let s = PET_STAGES[0]; PET_STAGES.forEach(x => { if (xp >= x[0]) s = x; }); return s; };
const nextStage = xp => PET_STAGES.find(x => x[0] > xp) || null;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function normPet(p) {
  p = p || {};
  const d = { name: "Minik", xp: 0, coins: 0, owned: [], wear: {}, effect: "💗", color: "", species: "", lastActive: todayKey, fedAt: Date.now(), pettedAt: Date.now(), claimed: [], partner: "" };
  Object.keys(d).forEach(k => { if (p[k] === undefined || p[k] === null) p[k] = d[k]; });
  if (typeof p.wear !== "object" || !p.wear) p.wear = {};
  if (p.coins == null || isNaN(p.coins)) p.coins = p.xp || 0;
  if (!Array.isArray(p.owned)) p.owned = [];
  if (!p.day || p.day.date !== todayKey) p.day = { date: todayKey, got: {} };
  if (!p.color && p.species) p.color = PET_COLORS[p.species][0][0];
  return p;
}
function myPet() {
  petState = normPet(petState);
  return petState;
}
function savePet() {
  clearTimeout(petSaveTimer);
  petSaveTimer = setTimeout(() => {
    if (!me || !db || !petState) return;
    petState.mood = petEmotion(petState);
    db.collection("profiles").doc(me.uid).update({ pet: petState }).catch(() => {});
  }, 800);
}
function petRerender() {
  if (state.view !== "pet" && state.view !== "home") return;
  clearTimeout(petRenderTimer);
  petRenderTimer = setTimeout(() => { if (state.view === "pet" || state.view === "home") scheduleRender(); }, 1600);
}
const dailyDone = p => DAILY.filter(([k]) => (p.day && p.day.date === todayKey && (p.day.got || {})[k] > 0)).length;

function petAward(kind, amount, cap) {
  if (!me) return 0;
  const p = myPet();
  const task = PET_TASKS.find(t => t[0] === kind);
  cap = cap || (task ? task[3] : amount);
  const got = p.day.got[kind] || 0;
  p.lastActive = todayKey;
  if (got >= cap) { savePet(); return 0; }
  const add = Math.min(amount || (task ? task[2] : 5), cap - got);
  const before = petStage(p.xp)[1];
  const doneBefore = dailyDone(p);
  p.xp += add;
  p.coins += add;
  p.day.got[kind] = got + add;
  savePet();
  if (p.species) {
    const after = petStage(p.xp)[1];
    if (after !== before) setTimeout(() => showToast(p.name + " büyüdü! Artık " + after + " " + (p.species === "bunny" ? "🐰" : "🐻"), "Ona bakmaya devam et, daha da büyüyecek ♡", () => go("pet"), "Gör"), 300);
    if (kind !== "bonus" && doneBefore < DAILY.length && dailyDone(p) === DAILY.length) {
      petAward("bonus", 30);
      setTimeout(() => showToast("Bugünün tüm görevleri tamam! 💞", p.name + " arkadaşıyla buluştu, +30 puan kazandın", () => go("pet"), "Buluşmayı gör"), 600);
    }
  }
  petRerender();
  return add;
}

function petNeeds(p) {
  const now = p.sleeping && p.sleepAt ? p.sleepAt : Date.now();
  return {
    hunger: Math.round(clamp(100 - (now - (p.fedAt || now)) / 3600000 * 5, 0, 100)),
    love: Math.round(clamp(100 - (now - (p.pettedAt || now)) / 3600000 * 4, 0, 100))
  };
}
function petEmotion(p, ownMood) {
  if (p.sleeping) return "asleep";
  const n = petNeeds(p);
  const mood = ownMood !== undefined ? ownMood : (p === petState && typeof journalOf === "function" ? ((journalOf(todayKey) || {}).mood || "") : "");
  if (n.hunger < 30) return "hungry";
  if (mood === "Zor bir gün" || n.love < 25) return "sad";
  if (mood === "Yorgun" || isBedtime()) return "sleepy";
  if (mood === "Harika" || (p.day && p.day.date === todayKey && dailyDone(p) === DAILY.length)) return "love";
  return "happy";
}
const isBedtime = () => { const hr = new Date().getHours(); return hr >= 22 || hr < 6; };
const otherEmotion = p => p.sleeping ? "asleep" : p.day && p.day.date !== todayKey && p.lastActive !== todayKey ? "sad" : (p.mood || "happy");

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.round(clamp(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt, 0, 255));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

function petSVGDrawn(o) {
  const sp = o.species === "bear" ? "bear" : "bunny";
  const c = o.color || PET_COLORS[sp][0][0];
  const emo = o.emotion || "happy";
  const w = o.wear || {};
  const id = "p" + Math.random().toString(36).slice(2, 8);
  const line = shade(c, -0.22);
  const light = shade(c, 0.45);
  const ink = "#3A2433";
  const fur = 'fill="url(#' + id + 'f)" stroke="' + line + '" stroke-width="2.5"';
  const furB = 'fill="url(#' + id + 'b)" stroke="' + line + '" stroke-width="2.5"';
  const top = sp === "bear" ? 40 : 46;
  let back = "", ears = "", eyes = "", mouth = "", acc = "", extra = "", faceAcc = "";
  const heart = (x, y, s, fill) => '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0 6C-7 1-10-4-6.5-7.5-4-10 0-8 0-5c0-3 4-5 6.5-2.5C10-4 7 1 0 6z" fill="' + fill + '"/>';
  if (w.back === "wings") back = '<path d="M62 168c-34-4-52-38-40-50 10-10 32 6 42 28zM138 168c34-4 52-38 40-50-10-10-32 6-42 28z" fill="#fff" stroke="#E7DDF0" stroke-width="3"/>';
  if (sp === "bunny") {
    ears = '<g class="ear-l"><path d="M82 74C60 54 48 8 63-3c15-10 36 34 35 70" ' + fur + '/><path d="M84 64C68 48 58 16 66 7c9-7 25 28 24 54" fill="url(#' + id + 'e)"/></g>' +
      '<g class="ear-r"><path d="M118 74c22-20 34-66 19-77-15-10-36 34-35 70" ' + fur + '/><path d="M116 64c16-16 26-48 18-57-9-7-25 28-24 54" fill="url(#' + id + 'e)"/></g>';
    extra = '<path d="M91 58q4-9 9-1q5-9 10 0" fill="none" stroke="' + line + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
  } else {
    ears = '<g class="ear-l"><circle cx="50" cy="52" r="22" ' + fur + '/><circle cx="50" cy="54" r="12" fill="#F7BACB"/></g>' +
      '<g class="ear-r"><circle cx="150" cy="52" r="22" ' + fur + '/><circle cx="150" cy="54" r="12" fill="#F7BACB"/></g>';
  }
  const openEyes = (big) => {
    const ry = big ? 13 : 11, rx = big ? 10.5 : 9;
    return '<ellipse cx="76" cy="104" rx="' + rx + '" ry="' + ry + '" fill="' + ink + '"/><ellipse cx="124" cy="104" rx="' + rx + '" ry="' + ry + '" fill="' + ink + '"/>' +
      '<circle cx="80" cy="98" r="4.2" fill="#fff"/><circle cx="128" cy="98" r="4.2" fill="#fff"/><circle cx="72.5" cy="109" r="2" fill="#fff" opacity=".9"/><circle cx="120.5" cy="109" r="2" fill="#fff" opacity=".9"/>';
  };
  if (emo === "love") eyes = heart(76, 104, 1.45, "#F0457F") + heart(124, 104, 1.45, "#F0457F") + '<path d="M44 82l3 6 6 3-6 3-3 6-3-6-6-3 6-3zM158 80l2.5 5 5 2.5-5 2.5-2.5 5-2.5-5-5-2.5 5-2.5z" fill="#FFD166"/>';
  else if (emo === "happy") eyes = '<path d="M66 108q10-14 20 0M114 108q10-14 20 0" fill="none" stroke="' + ink + '" stroke-width="5.5" stroke-linecap="round"/>';
  else if (emo === "sleepy") eyes = '<path d="M66 104q10 4 20 0M114 104q10 4 20 0" fill="none" stroke="' + ink + '" stroke-width="5" stroke-linecap="round"/><path d="M68 98q8-3 16 0M116 98q8-3 16 0" fill="none" stroke="' + line + '" stroke-width="3" stroke-linecap="round" opacity=".6"/>';
  else if (emo === "asleep") eyes = '<path d="M66 104q10 9 20 0M114 104q10 9 20 0" fill="none" stroke="' + ink + '" stroke-width="5" stroke-linecap="round"/>';
  else eyes = openEyes(emo === "sad" || emo === "hungry");
  if (emo === "sad") eyes += '<path d="M64 88q9-6 18 0M118 88q9-6 18 0" fill="none" stroke="' + line + '" stroke-width="3.5" stroke-linecap="round"/><path d="M66 116q-5 10 0 14q5-4 0-14z" fill="#9AD4FF"/>';
  const cheeks = '<ellipse cx="62" cy="124" rx="11" ry="7" fill="#FF9EBB" opacity=".75"/><ellipse cx="138" cy="124" rx="11" ry="7" fill="#FF9EBB" opacity=".75"/>' +
    '<path d="M57 122l3-4M62 123l3-4M67 124l3-4M133 124l3-4M138 123l3-4M143 122l3-4" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>';
  const muzzle = sp === "bear" ? '<ellipse cx="100" cy="126" rx="21" ry="15" fill="' + light + '" stroke="' + line + '" stroke-width="2" opacity=".95"/>' : "";
  const nose = sp === "bear" ? '<path d="M93 118q7-5 14 0q-2 7-7 8q-5-1-7-8z" fill="' + ink + '"/><ellipse cx="98" cy="119" rx="2" ry="1.2" fill="#fff" opacity=".6"/>' : '<path d="M95.5 116.5q4.5-3 9 0q-1.5 4.5-4.5 5.5q-3-1-4.5-5.5z" fill="#F27BA5"/><ellipse cx="98.5" cy="117.5" rx="1.6" ry="1" fill="#fff" opacity=".7"/>';
  const my = sp === "bear" ? 129 : 124;
  if (emo === "love" || emo === "happy") mouth = '<path d="M93 ' + my + 'q7 11 14 0z" fill="#E8506E" stroke="' + ink + '" stroke-width="2.5" stroke-linejoin="round"/><path d="M96 ' + (my + 4) + 'q4 4 8 0" fill="#FF9AB0"/>';
  else if (emo === "sad") mouth = '<path d="M93 ' + (my + 5) + 'q7-6 14 0" fill="none" stroke="' + ink + '" stroke-width="3.5" stroke-linecap="round"/>';
  else if (emo === "hungry") mouth = '<ellipse cx="100" cy="' + (my + 3) + '" rx="5" ry="6" fill="#E8506E" stroke="' + ink + '" stroke-width="2.5"/><path d="M107 ' + (my + 4) + 'q-2 10 2 12q4-3-2-12z" fill="#9AD4FF"/>';
  else mouth = '<path d="M92 ' + my + 'q4 5 8 0q4 5 8 0" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>';
  if (sp === "bunny" && (emo === "happy" || emo === "sleepy")) mouth = '<path d="M100 ' + (my - 2) + 'v3" stroke="' + ink + '" stroke-width="2.5" stroke-linecap="round"/><path d="M92 ' + (my + 1) + 'q4 5 8 0q4 5 8 0" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/><rect x="96.6" y="' + (my + 3.5) + '" width="6.8" height="5" rx="1.6" fill="#fff" stroke="' + ink + '" stroke-width="1.6"/><path d="M100 ' + (my + 3.5) + 'v5" stroke="' + ink + '" stroke-width="1.2"/>';
  const night = emo === "asleep" ? '<g class="zzz" font-family="sans-serif" font-weight="800" fill="#8E8BD8"><text x="146" y="58" font-size="22">Z</text><text x="164" y="38" font-size="16">z</text><text x="176" y="22" font-size="12">z</text></g>' : emo === "sleepy" ? '<g font-family="sans-serif" font-weight="800" fill="#A9A6D8"><text x="152" y="52" font-size="16">z</text></g>' : "";
  if (w.neck === "scarf") acc += '<path d="M62 154q38 16 76 0v12q-38 16-76 0z" fill="#F06283"/><path d="M74 162l-6 26 13-2 3-22z" fill="#D9486B"/><path d="M66 158q34 14 68 0" stroke="#fff" stroke-width="2.5" stroke-dasharray="5 7" fill="none" opacity=".7"/>';
  if (w.neck === "bowtie") acc += '<path d="M100 160l-17-10v20zM100 160l17-10v20z" fill="#8E6BD8"/><circle cx="100" cy="160" r="5" fill="#6E4BC0"/>';
  if (w.neck === "necklace") acc += '<path d="M74 152q26 22 52 0" fill="none" stroke="#FFC94A" stroke-width="3"/>' + heart(100, 168, .9, "#F0457F");
  if (w.face === "hglasses") faceAcc += heart(76, 102, 2.2, "rgba(255,120,170,.35)") + heart(124, 102, 2.2, "rgba(255,120,170,.35)") + '<path d="M88 102h24" stroke="#F0457F" stroke-width="3"/>';
  if (w.face === "sun") faceAcc += '<rect x="60" y="94" width="32" height="20" rx="9" fill="#2B1B2E"/><rect x="108" y="94" width="32" height="20" rx="9" fill="#2B1B2E"/><path d="M92 101h16" stroke="#2B1B2E" stroke-width="3"/><path d="M66 99l9-1" stroke="#fff" stroke-width="2.5" opacity=".6"/>';
  if (w.head === "bow") acc += '<g transform="translate(' + (sp === "bunny" ? 140 : 146) + ' ' + (top + 8) + ') rotate(18)"><path d="M0 0c-8-10-22-12-22 0s14 10 22 0zM0 0c8-10 22-12 22 0S8 10 0 0z" fill="#FF8FB5" stroke="#E86B98" stroke-width="2"/><circle r="6" fill="#F0457F"/></g>';
  if (w.head === "flower") acc += [[64, 12], [81, 4], [100, 1], [119, 4], [136, 12]].map(([x, d], i) => '<circle cx="' + x + '" cy="' + (top + d) + '" r="9.5" fill="' + ["#FFB3C7", "#FFE08A", "#C8A8FF", "#9FE3B8", "#FFB3C7"][i] + '"/><circle cx="' + x + '" cy="' + (top + d) + '" r="3.8" fill="#FFD25E"/>').join("");
  if (w.head === "party") acc += '<path d="M100 ' + (top - 44) + 'L82 ' + (top + 4) + 'H118z" fill="#8ECBFF" stroke="#6BB0EA" stroke-width="2"/><path d="M93 ' + (top - 22) + 'h14M88 ' + (top - 8) + 'h24" stroke="#fff" stroke-width="4"/><circle cx="100" cy="' + (top - 46) + '" r="7" fill="#FFD166"/>';
  if (w.head === "crown") acc += '<path d="M78 ' + (top + 4) + 'l5-26 12 15 5-19 5 19 12-15 5 26z" fill="#FFCF5C" stroke="#E0A020" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="' + (top - 8) + '" r="4" fill="#F0457F"/>';
  if (w.head === "halo") acc += '<ellipse cx="100" cy="' + (sp === "bunny" ? 0 : 20) + '" rx="30" ry="7" fill="none" stroke="#FFD25E" stroke-width="6"/>';
  if (emo === "asleep" && !w.head) acc += '<path d="M60 52q40-46 84-4" fill="#7C8CE0"/><path d="M60 52q42-16 84-4q-40 6-84 4z" fill="#fff"/><path d="M144 48q14 4 18 24" fill="none" stroke="#7C8CE0" stroke-width="7" stroke-linecap="round"/><circle cx="162" cy="76" r="7" fill="#fff"/>';
  const defs = '<defs>' +
    '<radialGradient id="' + id + 'f" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="' + light + '"/><stop offset=".55" stop-color="' + c + '"/><stop offset="1" stop-color="' + shade(c, -0.08) + '"/></radialGradient>' +
    '<radialGradient id="' + id + 'b" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="' + light + '"/><stop offset="1" stop-color="' + c + '"/></radialGradient>' +
    '<linearGradient id="' + id + 'e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD3E0"/><stop offset="1" stop-color="#FFA9C2"/></linearGradient></defs>';
  const face = '<g class="eyes">' + eyes + '</g>' + cheeks + nose + mouth + faceAcc;
  if (sp === "bunny") {
    const eye = (x, y, mirror) => {
      const o = mirror ? 1 : -1;
      return '<ellipse cx="' + x + '" cy="' + y + '" rx="13.5" ry="15" fill="#1C1A3A"/>' +
        '<ellipse cx="' + x + '" cy="' + (y + 1) + '" rx="11.5" ry="13" fill="url(#' + id + 'i)"/>' +
        '<circle cx="' + (x + .5) + '" cy="' + (y + 2.5) + '" r="6.2" fill="#12122E"/>' +
        '<path d="M' + (x - 8) + ' ' + (y + 8) + 'q8 6 16 0" fill="none" stroke="#9FC1FF" stroke-width="2" stroke-linecap="round" opacity=".8"/>' +
        (emo === "love" ? heart(x + 4, y - 5, .75, "#fff") : '<circle cx="' + (x + 4.5) + '" cy="' + (y - 4.5) + '" r="4.8" fill="#fff"/>') +
        '<circle cx="' + (x - 4.5) + '" cy="' + (y + 5) + '" r="2.1" fill="#fff" opacity=".9"/>' +
        '<path d="M' + (x - 14.5) + ' ' + (y - 3) + 'q14.5-17 29 0" fill="none" stroke="#1C1A3A" stroke-width="3.6" stroke-linecap="round"/>' +
        '<path d="M' + (x + o * 13) + ' ' + (y - 6) + 'q' + (o * 5) + ' -2 ' + (o * 8) + ' -7M' + (x + o * 9.5) + ' ' + (y - 10.5) + 'q' + (o * 3) + ' -3 ' + (o * 4.5) + ' -8" fill="none" stroke="#1C1A3A" stroke-width="2.6" stroke-linecap="round"/>';
    };
    const closed = (x, mirror) => {
      const o = mirror ? 1 : -1;
      return '<path d="M' + (x - 12) + ' 103q12 10 24 0" fill="none" stroke="#1C1A3A" stroke-width="3.6" stroke-linecap="round"/>' +
        '<path d="M' + (x + o * 11) + ' 105l' + (o * 5) + ' 4M' + (x + o * 6) + ' 108l' + (o * 3) + ' 5" stroke="#1C1A3A" stroke-width="2.4" stroke-linecap="round"/>';
    };
    let be = "";
    if (emo === "asleep") be = closed(78, false) + closed(122, true);
    else {
      be = eye(78, 102, false) + eye(122, 102, true);
      if (emo === "sleepy") be += '<path d="M63 99q15-18 30 0z" fill="' + c + '"/><path d="M107 99q15-18 30 0z" fill="' + c + '"/><path d="M64 99h28M108 99h28" stroke="#1C1A3A" stroke-width="3.4" stroke-linecap="round"/>';
    }
    const brows = emo === "sad" ? '<path d="M68 80q8-6 16 0M116 80q8-6 16 0" fill="none" stroke="' + line + '" stroke-width="2.6" stroke-linecap="round" transform="rotate(0)"/><path d="M72 82l10-5M128 82l-10-5" stroke="' + line + '" stroke-width="2.6" stroke-linecap="round"/>'
      : '<path d="M71 76q7-4 14-1M115 75q7-3 14 1" fill="none" stroke="' + line + '" stroke-width="2" stroke-linecap="round" opacity=".75"/>';
    const tear = emo === "sad" ? '<path d="M64 116q-5 9 0 13q5-4 0-13z" fill="#9AD4FF"/>' : "";
    const bNose = '<path d="M94.5 121q5.5-3.5 11 0q-2 6-5.5 7q-3.5-1-5.5-7z" fill="#F7A1B4" stroke="#E07A95" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="98" cy="122" rx="1.8" ry="1.1" fill="#fff" opacity=".7"/>';
    let bMouth;
    if (emo === "love") bMouth = '<path d="M100 128v2"/><path d="M92 131q8 11 16 0z" fill="#F0607E" stroke="#1C1A3A" stroke-width="2.4" stroke-linejoin="round"/>';
    else if (emo === "sad") bMouth = '<path d="M100 128v3M93 136q7-5 14 0" fill="none" stroke="#1C1A3A" stroke-width="2.6" stroke-linecap="round"/>';
    else if (emo === "hungry") bMouth = '<path d="M100 128v2" stroke="#1C1A3A" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="100" cy="134" rx="4.5" ry="5" fill="#F0607E" stroke="#1C1A3A" stroke-width="2.2"/><path d="M106 135q-2 9 2 11q4-3-2-11z" fill="#9AD4FF"/>';
    else bMouth = '<path d="M100 128v3M92 131q4 5 8 0q4 5 8 0" fill="none" stroke="#1C1A3A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
    const bCheeks = '<ellipse cx="60" cy="122" rx="14" ry="9" fill="url(#' + id + 'c)"/><ellipse cx="140" cy="122" rx="14" ry="9" fill="url(#' + id + 'c)"/>';
    const bFace = brows + '<g class="eyes">' + be + '</g>' + tear + bCheeks + bNose + bMouth + faceAcc;
    const foot = x => '<ellipse cx="' + x + '" cy="203" rx="21" ry="13" ' + furB + '/><ellipse cx="' + x + '" cy="206" rx="8.5" ry="6" fill="#F4A3B6"/><circle cx="' + (x - 9) + '" cy="198" r="3.2" fill="#F4A3B6"/><circle cx="' + x + '" cy="195.5" r="3.2" fill="#F4A3B6"/><circle cx="' + (x + 9) + '" cy="198" r="3.2" fill="#F4A3B6"/>';
    const bunnyDefs = defs.replace('</defs>', '<radialGradient id="' + id + 'i" cx=".45" cy=".35" r=".75"><stop offset="0" stop-color="#7D9BEA"/><stop offset=".6" stop-color="#3D55A8"/><stop offset="1" stop-color="#22306E"/></radialGradient><radialGradient id="' + id + 'c"><stop offset="0" stop-color="#FF9EBB" stop-opacity=".75"/><stop offset="1" stop-color="#FF9EBB" stop-opacity="0"/></radialGradient></defs>');
    return '<svg viewBox="0 -8 200 228" aria-hidden="true">' + bunnyDefs + back +
      '<ellipse cx="100" cy="215" rx="46" ry="6" fill="#000" opacity=".1"/>' +
      '<path d="M100 146c34 0 46 30 42 56H58c-4-26 8-56 42-56z" ' + furB + '/><path d="M100 154c16 0 24 16 23 34H77c-1-18 7-34 23-34z" fill="' + light + '" opacity=".75"/>' +
      foot(62) + foot(138) +
      '<path d="M84 176c-5 10-6 24-4 34 1 4 15 4 16 0 1-10 0-24-3-34zM116 176c5 10 6 24 4 34-1 4-15 4-16 0-1-10 0-24 3-34z" ' + furB + ' class="arm-l"/>' +
      ears + '<path d="M100 54c35 0 56 22 58 48 9 9 10 30-2 40-13 15-32 20-56 20s-43-5-56-20c-12-10-11-31-2-40 2-26 23-48 58-48z" ' + fur + '/>' +
      '<path d="M44 140q-6 6-1 12M156 140q6 6 1 12M52 148q-3 6 2 10M148 148q3 6-2 10" fill="none" stroke="' + line + '" stroke-width="2" stroke-linecap="round"/>' + extra +
      '<g transform="translate(0 6)">' + bFace + '</g>' + acc + night + '</svg>';
  }
  if (false) {
    const bean = (x) => '<ellipse cx="' + x + '" cy="207" rx="6" ry="4" fill="#FFB3C7"/><circle cx="' + (x - 6) + '" cy="200" r="2.2" fill="#FFB3C7"/><circle cx="' + x + '" cy="198" r="2.2" fill="#FFB3C7"/><circle cx="' + (x + 6) + '" cy="200" r="2.2" fill="#FFB3C7"/>';
    const carrot = emo === "asleep" ? "" : '<g transform="translate(101 170) rotate(-24) scale(1.25)"><path d="M-5-12h10l-5 30z" fill="#FF9A3C" stroke="#E07A1E" stroke-width="1.8" stroke-linejoin="round"/><path d="M-3-3h4M-2 5h3" stroke="#E07A1E" stroke-width="1.4" stroke-linecap="round"/><path d="M0-12c-6-8-10-6-8-1M0-12c0-9 4-11 5-4M0-12c6-7 10-4 7 0" fill="none" stroke="#5DBB63" stroke-width="2.6" stroke-linecap="round"/></g>';
    return '<svg viewBox="0 -8 200 228" aria-hidden="true">' + defs + back +
      '<ellipse cx="100" cy="214" rx="38" ry="6" fill="#000" opacity=".1"/>' +
      '<circle cx="138" cy="194" r="12" fill="#fff" stroke="' + line + '" stroke-width="2"/>' +
      '<path d="M100 148c32 0 44 26 40 48-3 14-77 14-80 0-4-22 8-48 40-48z" ' + furB + '/><ellipse cx="100" cy="186" rx="22" ry="17" fill="' + light + '" opacity=".85"/>' +
      '<ellipse cx="82" cy="204" rx="15" ry="10" ' + furB + '/><ellipse cx="118" cy="204" rx="15" ry="10" ' + furB + '/>' + bean(82) + bean(118) +
      '<ellipse cx="88" cy="180" rx="10" ry="9" ' + furB + ' class="arm-l"/><ellipse cx="112" cy="180" rx="10" ry="9" ' + furB + ' class="arm-r"/>' + carrot +
      ears + '<path d="M100 50c46 0 68 30 66 64-2 32-30 46-66 46s-64-14-66-46c-2-34 20-64 66-64z" ' + fur + '/>' +
      '<path d="M38 128q-8 2-6 8q4 2 8-2M162 128q8 2 6 8q-4 2-8-2" fill="' + c + '" stroke="' + line + '" stroke-width="2" stroke-linejoin="round"/>' + extra +
      '<g transform="translate(0 6)">' + face + '</g>' + acc + night + '</svg>';
  }
  return '<svg viewBox="0 -8 200 228" aria-hidden="true">' + defs + back +
    '<ellipse cx="100" cy="214" rx="40" ry="6" fill="#000" opacity=".1"/>' +
    '<ellipse cx="80" cy="205" rx="14" ry="9" ' + furB + '/><ellipse cx="120" cy="205" rx="14" ry="9" ' + furB + '/>' +
    '<ellipse cx="100" cy="180" rx="40" ry="31" ' + furB + '/><ellipse cx="100" cy="186" rx="23" ry="18" fill="' + light + '" opacity=".8"/>' +
    '<circle cx="88" cy="174" r="10" ' + furB + ' class="arm-l"/><circle cx="112" cy="174" r="10" ' + furB + ' class="arm-r"/>' +
    ears + '<ellipse cx="100" cy="100" rx="66" ry="60" ' + fur + '/>' + extra + muzzle +
    face + acc + night + '</svg>';
}

function bunnyDrawn(o) {
  const sp = "bear";
  const c = o.color || PET_COLORS.bunny[0][0];
  const emo = o.emotion || "happy";
  const w = o.wear || {};
  const id = "p" + Math.random().toString(36).slice(2, 8);
  const line = shade(c, -0.22);
  const light = shade(c, 0.45);
  const ink = "#3A2433";
  const fur = 'fill="url(#' + id + 'f)" stroke="' + line + '" stroke-width="2.5"';
  const furB = 'fill="url(#' + id + 'b)" stroke="' + line + '" stroke-width="2.5"';
  const top = sp === "bear" ? 40 : 46;
  let back = "", ears = "", eyes = "", mouth = "", acc = "", extra = "", faceAcc = "";
  const heart = (x, y, s, fill) => '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0 6C-7 1-10-4-6.5-7.5-4-10 0-8 0-5c0-3 4-5 6.5-2.5C10-4 7 1 0 6z" fill="' + fill + '"/>';
  if (w.back === "wings") back = '<path d="M62 168c-34-4-52-38-40-50 10-10 32 6 42 28zM138 168c34-4 52-38 40-50-10-10-32 6-42 28z" fill="#fff" stroke="#E7DDF0" stroke-width="3"/>';
  if (sp === "bunny") {
    ears = '<g class="ear-l"><path d="M82 74C60 54 48 8 63-3c15-10 36 34 35 70" ' + fur + '/><path d="M84 64C68 48 58 16 66 7c9-7 25 28 24 54" fill="url(#' + id + 'e)"/></g>' +
      '<g class="ear-r"><path d="M118 74c22-20 34-66 19-77-15-10-36 34-35 70" ' + fur + '/><path d="M116 64c16-16 26-48 18-57-9-7-25 28-24 54" fill="url(#' + id + 'e)"/></g>';
    extra = '<path d="M91 58q4-9 9-1q5-9 10 0" fill="none" stroke="' + line + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
  } else {
    ears = '<g transform="translate(0 7)"><g class="ear-l"><path d="M76 58C62 34 56-2 69-8c14-6 28 28 25 62" ' + fur + '/><path d="M78 50C68 30 64 6 71 1c8-4 17 22 15 46" fill="#FFC2D3"/></g>' +
      '<g class="ear-r"><path d="M124 58c14-24 20-60 7-66-14-6-28 28-25 62" ' + fur + '/><path d="M122 50c10-20 14-44 7-49-8-4-17 22-15 46" fill="#FFC2D3"/></g></g>';
    extra = '<path d="M90 43q4-9 9-1q5-9 10 0" fill="none" stroke="' + line + '" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  const openEyes = (big) => {
    const ry = big ? 13 : 11, rx = big ? 10.5 : 9;
    return '<ellipse cx="76" cy="104" rx="' + rx + '" ry="' + ry + '" fill="' + ink + '"/><ellipse cx="124" cy="104" rx="' + rx + '" ry="' + ry + '" fill="' + ink + '"/>' +
      '<circle cx="80" cy="98" r="4.2" fill="#fff"/><circle cx="128" cy="98" r="4.2" fill="#fff"/><circle cx="72.5" cy="109" r="2" fill="#fff" opacity=".9"/><circle cx="120.5" cy="109" r="2" fill="#fff" opacity=".9"/>';
  };
  if (emo === "love") eyes = heart(76, 104, 1.45, "#F0457F") + heart(124, 104, 1.45, "#F0457F") + '<path d="M44 82l3 6 6 3-6 3-3 6-3-6-6-3 6-3zM158 80l2.5 5 5 2.5-5 2.5-2.5 5-2.5-5-5-2.5 5-2.5z" fill="#FFD166"/>';
  else if (emo === "happy") eyes = openEyes(true);
  else if (emo === "sleepy") eyes = '<path d="M66 104q10 4 20 0M114 104q10 4 20 0" fill="none" stroke="' + ink + '" stroke-width="5" stroke-linecap="round"/><path d="M68 98q8-3 16 0M116 98q8-3 16 0" fill="none" stroke="' + line + '" stroke-width="3" stroke-linecap="round" opacity=".6"/>';
  else if (emo === "asleep") eyes = '<path d="M66 104q10 9 20 0M114 104q10 9 20 0" fill="none" stroke="' + ink + '" stroke-width="5" stroke-linecap="round"/>';
  else eyes = openEyes(emo === "sad" || emo === "hungry");
  if (["happy", "sad", "hungry"].includes(emo)) eyes += '<path d="M64.5 99q11.5-16 23 0M112.5 99q11.5-16 23 0" fill="none" stroke="' + ink + '" stroke-width="3.4" stroke-linecap="round"/><path d="M65 98q-5-1-8-6M67.5 93q-3-3-4-9M135 98q5-1 8-6M132.5 93q3-3 4-9" fill="none" stroke="' + ink + '" stroke-width="2.5" stroke-linecap="round"/>';
  if (emo === "asleep") eyes += '<path d="M66 106l-4 4M70 108l-2 5M134 106l4 4M130 108l2 5" stroke="' + ink + '" stroke-width="2.2" stroke-linecap="round"/>';
  if (emo === "sad") eyes += '<path d="M64 88q9-6 18 0M118 88q9-6 18 0" fill="none" stroke="' + line + '" stroke-width="3.5" stroke-linecap="round"/><path d="M66 116q-5 10 0 14q5-4 0-14z" fill="#9AD4FF"/>';
  const cheeks = '<ellipse cx="62" cy="124" rx="11" ry="7" fill="#FF9EBB" opacity=".75"/><ellipse cx="138" cy="124" rx="11" ry="7" fill="#FF9EBB" opacity=".75"/>' +
    '<path d="M57 122l3-4M62 123l3-4M67 124l3-4M133 124l3-4M138 123l3-4M143 122l3-4" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>';
  const muzzle = '<ellipse cx="100" cy="125" rx="17" ry="12" fill="' + light + '" opacity=".9"/>';
  const nose = '<path d="M94.5 117.5q5.5-3.5 11 0q-2 6-5.5 7q-3.5-1-5.5-7z" fill="#F48FAA" stroke="#E07A95" stroke-width="1.5" stroke-linejoin="round"/><ellipse cx="98" cy="118.5" rx="1.8" ry="1.1" fill="#fff" opacity=".7"/>';
  const my = sp === "bear" ? 129 : 124;
  if (emo === "love" || emo === "happy") mouth = '<path d="M93 ' + my + 'q7 11 14 0z" fill="#E8506E" stroke="' + ink + '" stroke-width="2.5" stroke-linejoin="round"/><path d="M96 ' + (my + 4) + 'q4 4 8 0" fill="#FF9AB0"/>';
  else if (emo === "sad") mouth = '<path d="M93 ' + (my + 5) + 'q7-6 14 0" fill="none" stroke="' + ink + '" stroke-width="3.5" stroke-linecap="round"/>';
  else if (emo === "hungry") mouth = '<ellipse cx="100" cy="' + (my + 3) + '" rx="5" ry="6" fill="#E8506E" stroke="' + ink + '" stroke-width="2.5"/><path d="M107 ' + (my + 4) + 'q-2 10 2 12q4-3-2-12z" fill="#9AD4FF"/>';
  else mouth = '<path d="M92 ' + my + 'q4 5 8 0q4 5 8 0" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/>';
  if (sp === "bunny" && (emo === "happy" || emo === "sleepy")) mouth = '<path d="M100 ' + (my - 2) + 'v3" stroke="' + ink + '" stroke-width="2.5" stroke-linecap="round"/><path d="M92 ' + (my + 1) + 'q4 5 8 0q4 5 8 0" fill="none" stroke="' + ink + '" stroke-width="3" stroke-linecap="round"/><rect x="96.6" y="' + (my + 3.5) + '" width="6.8" height="5" rx="1.6" fill="#fff" stroke="' + ink + '" stroke-width="1.6"/><path d="M100 ' + (my + 3.5) + 'v5" stroke="' + ink + '" stroke-width="1.2"/>';
  const night = emo === "asleep" ? '<g class="zzz" font-family="sans-serif" font-weight="800" fill="#8E8BD8"><text x="146" y="58" font-size="22">Z</text><text x="164" y="38" font-size="16">z</text><text x="176" y="22" font-size="12">z</text></g>' : emo === "sleepy" ? '<g font-family="sans-serif" font-weight="800" fill="#A9A6D8"><text x="152" y="52" font-size="16">z</text></g>' : "";
  if (w.neck === "scarf") acc += '<path d="M62 154q38 16 76 0v12q-38 16-76 0z" fill="#F06283"/><path d="M74 162l-6 26 13-2 3-22z" fill="#D9486B"/><path d="M66 158q34 14 68 0" stroke="#fff" stroke-width="2.5" stroke-dasharray="5 7" fill="none" opacity=".7"/>';
  if (w.neck === "bowtie") acc += '<path d="M100 160l-17-10v20zM100 160l17-10v20z" fill="#8E6BD8"/><circle cx="100" cy="160" r="5" fill="#6E4BC0"/>';
  if (w.neck === "necklace") acc += '<path d="M74 152q26 22 52 0" fill="none" stroke="#FFC94A" stroke-width="3"/>' + heart(100, 168, .9, "#F0457F");
  if (w.face === "hglasses") faceAcc += heart(76, 102, 2.2, "rgba(255,120,170,.35)") + heart(124, 102, 2.2, "rgba(255,120,170,.35)") + '<path d="M88 102h24" stroke="#F0457F" stroke-width="3"/>';
  if (w.face === "sun") faceAcc += '<rect x="60" y="94" width="32" height="20" rx="9" fill="#2B1B2E"/><rect x="108" y="94" width="32" height="20" rx="9" fill="#2B1B2E"/><path d="M92 101h16" stroke="#2B1B2E" stroke-width="3"/><path d="M66 99l9-1" stroke="#fff" stroke-width="2.5" opacity=".6"/>';
  if (w.head === "bow") acc += '<g transform="translate(' + (sp === "bunny" ? 140 : 146) + ' ' + (top + 8) + ') rotate(18)"><path d="M0 0c-8-10-22-12-22 0s14 10 22 0zM0 0c8-10 22-12 22 0S8 10 0 0z" fill="#FF8FB5" stroke="#E86B98" stroke-width="2"/><circle r="6" fill="#F0457F"/></g>';
  if (w.head === "flower") acc += [[64, 12], [81, 4], [100, 1], [119, 4], [136, 12]].map(([x, d], i) => '<circle cx="' + x + '" cy="' + (top + d) + '" r="9.5" fill="' + ["#FFB3C7", "#FFE08A", "#C8A8FF", "#9FE3B8", "#FFB3C7"][i] + '"/><circle cx="' + x + '" cy="' + (top + d) + '" r="3.8" fill="#FFD25E"/>').join("");
  if (w.head === "party") acc += '<path d="M100 ' + (top - 44) + 'L82 ' + (top + 4) + 'H118z" fill="#8ECBFF" stroke="#6BB0EA" stroke-width="2"/><path d="M93 ' + (top - 22) + 'h14M88 ' + (top - 8) + 'h24" stroke="#fff" stroke-width="4"/><circle cx="100" cy="' + (top - 46) + '" r="7" fill="#FFD166"/>';
  if (w.head === "crown") acc += '<path d="M78 ' + (top + 4) + 'l5-26 12 15 5-19 5 19 12-15 5 26z" fill="#FFCF5C" stroke="#E0A020" stroke-width="3" stroke-linejoin="round"/><circle cx="100" cy="' + (top - 8) + '" r="4" fill="#F0457F"/>';
  if (w.head === "halo") acc += '<ellipse cx="100" cy="' + -4 + '" rx="30" ry="7" fill="none" stroke="#FFD25E" stroke-width="6"/>';
  if (emo === "asleep" && !w.head) acc += '<path d="M60 52q40-46 84-4" fill="#7C8CE0"/><path d="M60 52q42-16 84-4q-40 6-84 4z" fill="#fff"/><path d="M144 48q14 4 18 24" fill="none" stroke="#7C8CE0" stroke-width="7" stroke-linecap="round"/><circle cx="162" cy="76" r="7" fill="#fff"/>';
  const defs = '<defs>' +
    '<radialGradient id="' + id + 'f" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="' + light + '"/><stop offset=".55" stop-color="' + c + '"/><stop offset="1" stop-color="' + shade(c, -0.08) + '"/></radialGradient>' +
    '<radialGradient id="' + id + 'b" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="' + light + '"/><stop offset="1" stop-color="' + c + '"/></radialGradient>' +
    '<linearGradient id="' + id + 'e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD3E0"/><stop offset="1" stop-color="#FFA9C2"/></linearGradient></defs>';
  const face = '<g class="eyes">' + eyes + '</g>' + cheeks + nose + mouth + faceAcc;
  if (sp === "bunny") {
    const eye = (x, y, mirror) => {
      const o = mirror ? 1 : -1;
      return '<ellipse cx="' + x + '" cy="' + y + '" rx="13.5" ry="15" fill="#1C1A3A"/>' +
        '<ellipse cx="' + x + '" cy="' + (y + 1) + '" rx="11.5" ry="13" fill="url(#' + id + 'i)"/>' +
        '<circle cx="' + (x + .5) + '" cy="' + (y + 2.5) + '" r="6.2" fill="#12122E"/>' +
        '<path d="M' + (x - 8) + ' ' + (y + 8) + 'q8 6 16 0" fill="none" stroke="#9FC1FF" stroke-width="2" stroke-linecap="round" opacity=".8"/>' +
        (emo === "love" ? heart(x + 4, y - 5, .75, "#fff") : '<circle cx="' + (x + 4.5) + '" cy="' + (y - 4.5) + '" r="4.8" fill="#fff"/>') +
        '<circle cx="' + (x - 4.5) + '" cy="' + (y + 5) + '" r="2.1" fill="#fff" opacity=".9"/>' +
        '<path d="M' + (x - 14.5) + ' ' + (y - 3) + 'q14.5-17 29 0" fill="none" stroke="#1C1A3A" stroke-width="3.6" stroke-linecap="round"/>' +
        '<path d="M' + (x + o * 13) + ' ' + (y - 6) + 'q' + (o * 5) + ' -2 ' + (o * 8) + ' -7M' + (x + o * 9.5) + ' ' + (y - 10.5) + 'q' + (o * 3) + ' -3 ' + (o * 4.5) + ' -8" fill="none" stroke="#1C1A3A" stroke-width="2.6" stroke-linecap="round"/>';
    };
    const closed = (x, mirror) => {
      const o = mirror ? 1 : -1;
      return '<path d="M' + (x - 12) + ' 103q12 10 24 0" fill="none" stroke="#1C1A3A" stroke-width="3.6" stroke-linecap="round"/>' +
        '<path d="M' + (x + o * 11) + ' 105l' + (o * 5) + ' 4M' + (x + o * 6) + ' 108l' + (o * 3) + ' 5" stroke="#1C1A3A" stroke-width="2.4" stroke-linecap="round"/>';
    };
    let be = "";
    if (emo === "asleep") be = closed(78, false) + closed(122, true);
    else {
      be = eye(78, 102, false) + eye(122, 102, true);
      if (emo === "sleepy") be += '<path d="M63 99q15-18 30 0z" fill="' + c + '"/><path d="M107 99q15-18 30 0z" fill="' + c + '"/><path d="M64 99h28M108 99h28" stroke="#1C1A3A" stroke-width="3.4" stroke-linecap="round"/>';
    }
    const brows = emo === "sad" ? '<path d="M68 80q8-6 16 0M116 80q8-6 16 0" fill="none" stroke="' + line + '" stroke-width="2.6" stroke-linecap="round" transform="rotate(0)"/><path d="M72 82l10-5M128 82l-10-5" stroke="' + line + '" stroke-width="2.6" stroke-linecap="round"/>'
      : '<path d="M71 76q7-4 14-1M115 75q7-3 14 1" fill="none" stroke="' + line + '" stroke-width="2" stroke-linecap="round" opacity=".75"/>';
    const tear = emo === "sad" ? '<path d="M64 116q-5 9 0 13q5-4 0-13z" fill="#9AD4FF"/>' : "";
    const bNose = '<path d="M94.5 121q5.5-3.5 11 0q-2 6-5.5 7q-3.5-1-5.5-7z" fill="#F7A1B4" stroke="#E07A95" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="98" cy="122" rx="1.8" ry="1.1" fill="#fff" opacity=".7"/>';
    let bMouth;
    if (emo === "love") bMouth = '<path d="M100 128v2"/><path d="M92 131q8 11 16 0z" fill="#F0607E" stroke="#1C1A3A" stroke-width="2.4" stroke-linejoin="round"/>';
    else if (emo === "sad") bMouth = '<path d="M100 128v3M93 136q7-5 14 0" fill="none" stroke="#1C1A3A" stroke-width="2.6" stroke-linecap="round"/>';
    else if (emo === "hungry") bMouth = '<path d="M100 128v2" stroke="#1C1A3A" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="100" cy="134" rx="4.5" ry="5" fill="#F0607E" stroke="#1C1A3A" stroke-width="2.2"/><path d="M106 135q-2 9 2 11q4-3-2-11z" fill="#9AD4FF"/>';
    else bMouth = '<path d="M100 128v3M92 131q4 5 8 0q4 5 8 0" fill="none" stroke="#1C1A3A" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>';
    const bCheeks = '<ellipse cx="60" cy="122" rx="14" ry="9" fill="url(#' + id + 'c)"/><ellipse cx="140" cy="122" rx="14" ry="9" fill="url(#' + id + 'c)"/>';
    const bFace = brows + '<g class="eyes">' + be + '</g>' + tear + bCheeks + bNose + bMouth + faceAcc;
    const foot = x => '<ellipse cx="' + x + '" cy="203" rx="21" ry="13" ' + furB + '/><ellipse cx="' + x + '" cy="206" rx="8.5" ry="6" fill="#F4A3B6"/><circle cx="' + (x - 9) + '" cy="198" r="3.2" fill="#F4A3B6"/><circle cx="' + x + '" cy="195.5" r="3.2" fill="#F4A3B6"/><circle cx="' + (x + 9) + '" cy="198" r="3.2" fill="#F4A3B6"/>';
    const bunnyDefs = defs.replace('</defs>', '<radialGradient id="' + id + 'i" cx=".45" cy=".35" r=".75"><stop offset="0" stop-color="#7D9BEA"/><stop offset=".6" stop-color="#3D55A8"/><stop offset="1" stop-color="#22306E"/></radialGradient><radialGradient id="' + id + 'c"><stop offset="0" stop-color="#FF9EBB" stop-opacity=".75"/><stop offset="1" stop-color="#FF9EBB" stop-opacity="0"/></radialGradient></defs>');
    return '<svg viewBox="0 -8 200 228" aria-hidden="true">' + bunnyDefs + back +
      '<ellipse cx="100" cy="215" rx="46" ry="6" fill="#000" opacity=".1"/>' +
      '<path d="M100 146c34 0 46 30 42 56H58c-4-26 8-56 42-56z" ' + furB + '/><path d="M100 154c16 0 24 16 23 34H77c-1-18 7-34 23-34z" fill="' + light + '" opacity=".75"/>' +
      foot(62) + foot(138) +
      '<path d="M84 176c-5 10-6 24-4 34 1 4 15 4 16 0 1-10 0-24-3-34zM116 176c5 10 6 24 4 34-1 4-15 4-16 0-1-10 0-24 3-34z" ' + furB + ' class="arm-l"/>' +
      ears + '<path d="M100 54c35 0 56 22 58 48 9 9 10 30-2 40-13 15-32 20-56 20s-43-5-56-20c-12-10-11-31-2-40 2-26 23-48 58-48z" ' + fur + '/>' +
      '<path d="M44 140q-6 6-1 12M156 140q6 6 1 12M52 148q-3 6 2 10M148 148q3 6-2 10" fill="none" stroke="' + line + '" stroke-width="2" stroke-linecap="round"/>' + extra +
      '<g transform="translate(0 6)">' + bFace + '</g>' + acc + night + '</svg>';
  }
  if (false) {
    const bean = (x) => '<ellipse cx="' + x + '" cy="207" rx="6" ry="4" fill="#FFB3C7"/><circle cx="' + (x - 6) + '" cy="200" r="2.2" fill="#FFB3C7"/><circle cx="' + x + '" cy="198" r="2.2" fill="#FFB3C7"/><circle cx="' + (x + 6) + '" cy="200" r="2.2" fill="#FFB3C7"/>';
    const carrot = emo === "asleep" ? "" : '<g transform="translate(101 170) rotate(-24) scale(1.25)"><path d="M-5-12h10l-5 30z" fill="#FF9A3C" stroke="#E07A1E" stroke-width="1.8" stroke-linejoin="round"/><path d="M-3-3h4M-2 5h3" stroke="#E07A1E" stroke-width="1.4" stroke-linecap="round"/><path d="M0-12c-6-8-10-6-8-1M0-12c0-9 4-11 5-4M0-12c6-7 10-4 7 0" fill="none" stroke="#5DBB63" stroke-width="2.6" stroke-linecap="round"/></g>';
    return '<svg viewBox="0 -8 200 228" aria-hidden="true">' + defs + back +
      '<ellipse cx="100" cy="214" rx="38" ry="6" fill="#000" opacity=".1"/>' +
      '<circle cx="138" cy="194" r="12" fill="#fff" stroke="' + line + '" stroke-width="2"/>' +
      '<path d="M100 148c32 0 44 26 40 48-3 14-77 14-80 0-4-22 8-48 40-48z" ' + furB + '/><ellipse cx="100" cy="186" rx="22" ry="17" fill="' + light + '" opacity=".85"/>' +
      '<ellipse cx="82" cy="204" rx="15" ry="10" ' + furB + '/><ellipse cx="118" cy="204" rx="15" ry="10" ' + furB + '/>' + bean(82) + bean(118) +
      '<ellipse cx="88" cy="180" rx="10" ry="9" ' + furB + ' class="arm-l"/><ellipse cx="112" cy="180" rx="10" ry="9" ' + furB + ' class="arm-r"/>' + carrot +
      ears + '<path d="M100 50c46 0 68 30 66 64-2 32-30 46-66 46s-64-14-66-46c-2-34 20-64 66-64z" ' + fur + '/>' +
      '<path d="M38 128q-8 2-6 8q4 2 8-2M162 128q8 2 6 8q-4 2-8-2" fill="' + c + '" stroke="' + line + '" stroke-width="2" stroke-linejoin="round"/>' + extra +
      '<g transform="translate(0 6)">' + face + '</g>' + acc + night + '</svg>';
  }
  return '<svg viewBox="0 -8 200 228" aria-hidden="true">' + defs + back +
    '<ellipse cx="100" cy="214" rx="40" ry="6" fill="#000" opacity=".1"/>' +
    '<ellipse cx="80" cy="205" rx="14" ry="9" ' + furB + '/><ellipse cx="120" cy="205" rx="14" ry="9" ' + furB + '/>' +
    '<ellipse cx="100" cy="180" rx="40" ry="31" ' + furB + '/><ellipse cx="100" cy="186" rx="23" ry="18" fill="' + light + '" opacity=".8"/>' +
    '<circle cx="88" cy="174" r="10" ' + furB + ' class="arm-l"/><circle cx="112" cy="174" r="10" ' + furB + ' class="arm-r"/>' +
    ears + '<ellipse cx="100" cy="100" rx="66" ry="60" ' + fur + '/>' + extra + muzzle +
    face + acc + night + '</svg>';
}

function bunnySVG(o) {
  const c = o.color || PET_COLORS.bunny[0][0];
  const emo = o.emotion || "happy";
  const w = o.wear || {};
  const id = "p" + Math.random().toString(36).slice(2, 8);
  const fc = "#FFFDFB", line = "#E3D6DE", pad = "#FFB3C7";
  const t = (ch, x, y, size) => '<text x="' + x + '" y="' + y + '" font-size="' + size + '" text-anchor="middle" dominant-baseline="central">' + ch + '</text>';
  let back = "", acc = "", neck = "", badge = "";
  if (w.back === "wings") back = '<path d="M60 172c-34-6-50-42-38-54 11-10 32 8 40 30zM140 172c34-6 50-42 38-54-11-10-32 8-40 30z" fill="#fff" stroke="#E7DDF0" stroke-width="3"/>';
  if (w.head === "halo") back += '<ellipse cx="100" cy="6" rx="32" ry="7" fill="none" stroke="#FFD25E" stroke-width="6"/>';
  if (w.head === "bow") acc += t("🎀", 140, 40, 40);
  if (w.head === "flower") acc += t("🌸", 70, 40, 26) + t("🌼", 100, 30, 26) + t("🌷", 130, 40, 26);
  if (w.head === "party") acc += t("🎩", 100, 18, 46);
  if (w.head === "crown") acc += t("👑", 100, 18, 44);
  if (w.face === "hglasses") acc += t("👓", 100, 96, 60);
  if (w.face === "sun") acc += t("🕶️", 100, 96, 60);
  if (w.neck === "scarf") neck = t("🧣", 100, 160, 40);
  if (w.neck === "necklace") neck = '<path d="M78 150q22 18 44 0" fill="none" stroke="#FFC94A" stroke-width="3"/><path transform="translate(100 164) scale(.9)" d="M0 6C-7 1-10-4-6.5-7.5-4-10 0-8 0-5c0-3 4-5 6.5-2.5C10-4 7 1 0 6z" fill="#F0457F"/>';
  if (w.neck === "bowtie") neck = '<path d="M100 158l-16-10v20zM100 158l16-10v20z" fill="#8E6BD8"/><circle cx="100" cy="158" r="5" fill="#6E4BC0"/>';
  const badges = { love: "💕", sad: "💧", sleepy: "😪", asleep: "💤" };
  if (badges[emo]) badge = '<g class="emo-badge">' + t(badges[emo], 34, 44, emo === "sad" ? 28 : 34) + '</g>';
  if (emo === "hungry") badge = '<g class="emo-badge"><ellipse cx="34" cy="44" rx="22" ry="18" fill="#fff" stroke="#EADFEA" stroke-width="2"/><circle cx="52" cy="66" r="4.5" fill="#fff" stroke="#EADFEA" stroke-width="2"/>' + t("🥕", 34, 44, 24) + '</g>';
  const foot = x => '<ellipse cx="' + x + '" cy="204" rx="17" ry="11" fill="' + fc + '" stroke="' + line + '" stroke-width="2.5"/><ellipse cx="' + x + '" cy="207" rx="6.5" ry="4.5" fill="' + pad + '"/><circle cx="' + (x - 7) + '" cy="200" r="2.4" fill="' + pad + '"/><circle cx="' + x + '" cy="198" r="2.4" fill="' + pad + '"/><circle cx="' + (x + 7) + '" cy="200" r="2.4" fill="' + pad + '"/>';
  const headCls = emo === "asleep" ? "pet-emoji asleep" : emo === "sad" ? "pet-emoji sad" : "pet-emoji";
  return '<svg viewBox="0 -8 200 228" aria-hidden="true"><defs><radialGradient id="' + id + 'a"><stop offset="0" stop-color="' + c + '" stop-opacity=".9"/><stop offset=".6" stop-color="' + c + '" stop-opacity=".4"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="' + id + 'b" cx=".5" cy=".3" r=".75"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#F3EEF2"/></radialGradient></defs>' +
    '<circle cx="100" cy="120" r="94" fill="url(#' + id + 'a)"/>' + back +
    '<ellipse cx="100" cy="215" rx="42" ry="6" fill="#000" opacity=".1"/>' +
    '<circle cx="140" cy="196" r="11" fill="#fff" stroke="' + line + '" stroke-width="2"/>' +
    '<ellipse cx="100" cy="182" rx="40" ry="31" fill="url(#' + id + 'b)" stroke="' + line + '" stroke-width="2.5"/>' +
    '<ellipse cx="100" cy="188" rx="22" ry="17" fill="#FFF3F7"/>' +
    foot(80) + foot(120) +
    '<ellipse cx="86" cy="176" rx="9.5" ry="10.5" fill="' + fc + '" stroke="' + line + '" stroke-width="2.5" class="arm-l"/><ellipse cx="114" cy="176" rx="9.5" ry="10.5" fill="' + fc + '" stroke="' + line + '" stroke-width="2.5" class="arm-r"/>' +
    neck + '<g class="' + headCls + '">' + t("🐰", 100, 94, 126) + '</g>' + acc + badge + '</svg>';
}

function petSVG(o) {
  return o.species === "bear" ? petSVGDrawn(o) : bunnyDrawn(o);
}

function petSay(stage, text) {
  const old = stage.querySelector(".pet-bubble");
  if (old) old.remove();
  const b = h("span", { class: "pet-bubble", text });
  stage.append(b);
  setTimeout(() => b.classList.add("out"), 2600);
  setTimeout(() => b.remove(), 3100);
}
function petBurst(stage, emoji, n) {
  for (let i = 0; i < (n || 7); i++) {
    const s = h("i", { class: "pet-heart", text: emoji || "💗", style: "--x:" + (Math.random() * 140 - 70) + "px;--d:" + (i * .08) + "s" });
    stage.append(s);
    setTimeout(() => s.remove(), 1700);
  }
}
function petLine(p) {
  const emo = petEmotion(p);
  const food = PET_FOOD[p.species || "bunny"];
  const lines = {
    happy: ["Seninle olmak çok güzel 💗", "Bugün harikasın! ✨", "Birlikte ne güzel bir gün!", "Bana sarılır mısın? 🤗"],
    love: ["Seni çok seviyorum! 🥰", "Bugün dünyanın en mutlu " + PET_SPECIES[p.species || "bunny"].toLowerCase() + "uyum!", "İyi ki varsın 💞"],
    sad: ["Biraz üzgünüm, sarılır mısın? 🥺", "Yanımda kalır mısın?", "Moralim bozuk ama seni görünce iyi geldi 🤍"],
    sleepy: ["Biraz uykum var 😴", "Birlikte dinlenelim mi?"],
    hungry: ["Karnım çok aç, bana " + food[1] + " verir misin? " + food[0], "Mmm " + food[1] + " kokusu mu geliyor? " + food[0]]
  }[emo].slice();
  if (emo !== "hungry" && emo !== "sad") {
    if (typeof prayedToday === "function" && !prayedToday().length) lines.push("Bugün bir dua okuyalım mı? 🤲");
    if (!p.day.got.olumlama) lines.push("Günün olumlaması seni bekliyor 🌸");
  }
  return lines[Math.floor(Math.random() * lines.length)];
}

function petView(p, opts) {
  opts = opts || {};
  const emo = opts.emotion || petEmotion(p);
  const st = petStage(p.xp || 0);
  const wrap = h("div", { class: "pet-wrap", style: "--s:" + (opts.scale || st[2]) });
  const btn = h("button", { class: "pet-svg", type: "button", "aria-label": p.name || "Pet", html: petSVG({ species: p.species, color: p.color, emotion: emo, wear: p.wear }) });
  wrap.append(btn);
  return { wrap, btn, emo };
}

function sleepPet() {
  const p = myPet();
  if (p.sleeping) return;
  p.sleeping = true;
  p.sleepAt = Date.now();
  savePet();
  showToast(p.name + " uyudu 🌙", "Sen uyurken o da dinlenecek, acıkmayacak. Sabah uyandırmayı unutma ♡");
  render();
}
function wakePet() {
  const p = myPet();
  if (!p.sleeping) return;
  const slept = Date.now() - (p.sleepAt || Date.now());
  p.fedAt = (p.fedAt || Date.now()) + slept;
  p.pettedAt = (p.pettedAt || Date.now()) + slept;
  p.sleeping = false;
  p.sleepAt = 0;
  if (slept >= 5 * 3600000) { p.pettedAt = Date.now(); petAward("uyku", 15); }
  savePet();
  showToast("Günaydın " + p.name + "! ☀️", slept >= 5 * 3600000 ? "Güzel bir uyku çekti, +15 puan kazandın" : "Biraz kestirdi, şimdi enerji dolu");
  render();
}
const sleepBtn = (p, small) => h("button", { class: "btn" + (small ? " small light-btn" : ""), type: "button", text: p.sleeping ? "Uyandır ☀️" : "Uyut 🌙", onclick: () => p.sleeping ? wakePet() : sleepPet() });

function feedPet(stage) {
  const p = myPet();
  if (p.sleeping) { petSay(stage, "Şşş… " + p.name + " uyuyor 🤫"); return; }
  const n = petNeeds(p);
  const food = PET_FOOD[p.species];
  if (n.hunger >= 90) { petSay(stage, "Karnım tok 😋 Biraz sonra tekrar"); return; }
  p.fedAt = Date.now();
  petAward("besle", 10);
  petBurst(stage, food[0], 6);
  petSay(stage, "Mmm çok lezzetli! Teşekkür ederim " + food[0]);
}
function lovePet(stage) {
  const p = myPet();
  if (p.sleeping) { petSay(stage, "Şşş… tatlı rüyalar görüyor 💤"); petBurst(stage, "💤", 3); return; }
  p.pettedAt = Date.now();
  petAward("sev", 5);
  petBurst(stage, "💗", 8);
  petSay(stage, petLine(p));
}

function petStageEl(p, big, interactive) {
  const v = petView(p);
  const stage = h("div", { class: "pet-stage" + (big ? " big" : "") + (p.sleeping ? " night" : ""), "data-fx": p.sleeping ? "💤" : (p.effect || "") }, v.wrap);
  if (interactive) v.btn.addEventListener("click", () => { v.wrap.classList.remove("hop"); void v.wrap.offsetWidth; v.wrap.classList.add("hop"); setTimeout(() => v.wrap.classList.remove("hop"), 700); lovePet(stage); });
  return stage;
}

function needBar(label, val, cls) {
  return h("div", { class: "need" }, h("span", { text: label }), h("div", { class: "bar " + (cls || "") }, h("i", { style: "width:" + val + "%" })), h("small", { text: "%" + val }));
}

function petCard() {
  const p = myPet();
  if (!p.species) {
    return h("section", { class: "card pet-card span-3" },
      h("div", { class: "pet-top" }, h("strong", { text: "Minik dostun seni bekliyor" })),
      h("div", { class: "pet-duo" }, h("span", { html: petSVG({ species: "bunny", emotion: "happy" }) }), h("span", { html: petSVG({ species: "bear", emotion: "happy" }) })),
      h("button", { class: "btn primary small", type: "button", style: "align-self:center;margin-top:.6rem", text: "Petini seç 🐰🐻", onclick: () => go("pet") }));
  }
  const n = petNeeds(p);
  const stage = petStageEl(p, false, true);
  return h("section", { class: "card pet-card span-3" },
    h("div", { class: "pet-top" }, h("strong", { text: p.name }), h("span", { class: "pet-lv", text: petStage(p.xp)[1] })),
    stage,
    needBar("Tokluk", n.hunger, n.hunger < 30 ? "low" : ""),
    needBar("Sevgi", n.love, n.love < 30 ? "low" : ""),
    h("div", { class: "row", style: "justify-content:center;margin-top:.5rem;gap:.4rem" },
      p.sleeping ? null : h("button", { class: "btn small light-btn", type: "button", text: "Besle " + PET_FOOD[p.species][0], onclick: () => feedPet(stage) }),
      p.sleeping ? null : h("button", { class: "btn small light-btn", type: "button", text: "Sev 💗", onclick: () => lovePet(stage) }),
      p.sleeping || isBedtime() ? sleepBtn(p, true) : null),
    h("button", { class: "more", type: "button", text: p.name + "'e git", onclick: () => go("pet") })
  );
}

function sendPetHeart(friend) {
  const sent = listOf("petheart").some(x => isMine(x) && x.to === friend.uid && x.date === todayKey);
  if (sent) { showToast("Bugün zaten sevdin 💗", "Yarın yine sevebilirsin."); return; }
  addItem("petheart", { to: friend.uid, date: todayKey }, { vis: "some", mode: "only", people: [friend.uid] });
  showToast((friend.pet && friend.pet.name || "Pet") + " sevildi 💗", friend.name + " bunu görünce çok sevinecek.");
}
function claimHearts() {
  if (!me) return;
  const p = myPet();
  const fresh = listOf("petheart").filter(x => x.to === me.uid && !isMine(x) && !p.claimed.includes(x.id));
  if (!fresh.length) return;
  fresh.forEach(x => { p.claimed.push(x.id); p.pettedAt = Date.now(); petAward("kalp", 5); });
  p.claimed = p.claimed.slice(-80);
  savePet();
}

function choosePartner() {
  const p = myPet();
  const root = $("dialog");
  const close = () => { root.classList.remove("show"); setTimeout(() => { root.hidden = true; root.replaceChildren(); }, 160); };
  root.replaceChildren(
    h("div", { class: "dlg-back", onclick: close }),
    h("div", { class: "dlg dlg-wide", role: "dialog", "aria-modal": "true", "aria-label": "Petini paylaş" },
      h("span", { class: "dlg-ic", html: ico("heart", 26) }),
      h("h2", { text: p.name + "'i kiminle paylaşalım?" }),
      h("p", { class: "clip", text: "Paylaştığın kişinin petiyle birlikte görev yapıp buluşacaklar 💞" }),
      profiles.length ? h("div", { class: "aud-people", style: "justify-content:center;margin:.6rem 0 .2rem" }, profiles.map(f =>
        h("button", { type: "button", class: "person" + (p.partner === f.uid ? " on" : ""), onclick: () => {
          p.partner = f.uid; savePet(); close(); render();
          sendQuickMessage(f.uid, { text: "💞 Petim " + p.name + "'i seninle paylaştım! Hadi birlikte bakalım 🐰🐻" }).catch(() => {});
          showToast(p.name + " artık " + f.name + " ile paylaşıldı 💞");
        } }, avatar(f), h("span", { text: f.name })))) : h("p", { class: "empty", text: "Henüz başka profil yok." }),
      h("div", { class: "dlg-actions" },
        p.partner ? h("button", { class: "btn danger", type: "button", text: "Paylaşımı bitir", onclick: () => { p.partner = ""; savePet(); close(); render(); } }) : null,
        h("button", { class: "btn", type: "button", text: "Vazgeç", onclick: close }))
    )
  );
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add("show"));
}

function meetingCard(p) {
  const partner = p.partner ? profileOf(p.partner) : null;
  const other = partner && partner.pet && partner.pet.species ? Object.assign({ name: "Pet" }, partner.pet) : {
    name: p.species === "bunny" ? "Boncuk" : "Pamuk", species: p.species === "bunny" ? "bear" : "bunny", xp: p.xp, wear: {}, color: "", mood: "happy"
  };
  const mine = dailyDone(p) / DAILY.length;
  const theirs = partner && partner.pet ? (partner.pet.day && partner.pet.day.date === todayKey ? DAILY.filter(([k]) => (partner.pet.day.got || {})[k] > 0).length : 0) / DAILY.length : mine;
  const prog = partner ? (mine + theirs) / 2 : mine;
  const met = prog >= 1;
  const a = petView(p), b = petView(other, { emotion: met ? "love" : (partner ? otherEmotion(other) : "happy") });
  a.wrap.classList.add("meet-l"); b.wrap.classList.add("meet-r");
  const scene = h("div", { class: "meet-scene" + (met ? " met" : ""), style: "--p:" + prog.toFixed(2), "data-fx": met ? "💞" : "" }, a.wrap, b.wrap, met ? h("span", { class: "meet-heart", text: "💞" }) : null);
  return card({ title: "Buluşma", icon: "heart", span: "span-12", tint: "t-blush",
    body: [
      h("p", { class: "empty", text: met ? p.name + " ve " + other.name + " bugün buluştu! Görevlerinizi tamamladınız 💞"
        : partner ? "Siz görev yaptıkça " + p.name + " ile " + other.name + " birbirine yaklaşıyor. İkiniz de bugünün görevlerini bitirince buluşacaklar."
        : "Görev yaptıkça " + p.name + " arkadaşı " + other.name + "'a yaklaşıyor. Bugünün tüm görevlerini bitirince buluşacaklar." }),
      scene,
      h("div", { class: "row", style: "justify-content:space-between;margin-top:.6rem" },
        h("span", { class: "tag", text: "Senin görevlerin: " + dailyDone(p) + "/" + DAILY.length + (partner ? ", " + partner.name + ": " + Math.round(theirs * DAILY.length) + "/" + DAILY.length : "") }),
        h("div", { class: "row", style: "gap:.4rem" },
          partner ? h("button", { class: "btn small", type: "button", text: other.name + "'i sev 💗", onclick: () => sendPetHeart(partner) }) : null,
          h("button", { class: "btn small primary", type: "button", text: partner ? partner.name + " ile paylaşılıyor 💞" : "Şununla paylaş 💞", onclick: choosePartner })))
    ] });
}

function petSetup() {
  const p = myPet();
  const pick = state.petPick || { species: "bunny", name: p.name && p.name !== "Neri" ? p.name : "", color: "" };
  state.petPick = pick;
  const colors = PET_COLORS[pick.species];
  if (!colors.some(x => x[0] === pick.color)) pick.color = colors[0][0];
  return h("div", {},
    pageHead("Petim", "Minik bir dost seç. Sen kendine iyi baktıkça o da büyüyecek ♡"),
    h("section", { class: "card pet-setup" },
      h("h3", { text: "1. Dostunu seç" }),
      h("div", { class: "species-pick" }, Object.entries(PET_SPECIES).map(([k, label]) =>
        h("button", { type: "button", class: "species" + (pick.species === k ? " on" : ""), onclick: () => { pick.species = k; pick.color = ""; render(); } },
          h("span", { html: petSVG({ species: k, emotion: "happy", color: k === pick.species ? pick.color : "" }) }), h("strong", { text: label })))),
      h("h3", { text: "2. Rengini seç" }),
      h("div", { class: "swatches" }, colors.map(([hex, label]) =>
        h("button", { type: "button", class: "swatch" + (pick.color === hex ? " on" : ""), title: label, "aria-label": label, style: "--c:" + hex, onclick: () => { pick.color = hex; render(); } }))),
      h("h3", { text: "3. Ona bir isim ver" }),
      h("input", { class: "field", id: "petNewName", type: "text", maxlength: "16", placeholder: pick.species === "bunny" ? "Örn. Pamuk" : "Örn. Boncuk", value: pick.name, oninput: e => { pick.name = e.target.value; } }),
      h("button", { class: "btn primary", type: "button", style: "margin-top:1.2rem", text: "Hadi başlayalım 💗", onclick: () => {
        const nm = ($("petNewName").value || "").trim() || (pick.species === "bunny" ? "Pamuk" : "Boncuk");
        Object.assign(p, { species: pick.species, color: pick.color, name: nm, fedAt: Date.now() - 3600000 * 6, pettedAt: Date.now() - 3600000 * 6, wear: {}, effect: "💗" });
        state.petPick = null; savePet(); render();
        showToast(nm + " ile tanıştın! 🎉", "Onu beslemeyi ve sevmeyi unutma ♡");
      } })
    )
  );
}

function renderPet() {
  const p = myPet();
  if (!p.species) return petSetup();
  claimHearts();
  const n = petNeeds(p);
  const emo = petEmotion(p);
  const st = petStage(p.xp), nx = nextStage(p.xp);
  const stage = petStageEl(p, true, true);
  const food = PET_FOOD[p.species];
  const status = p.sleeping ? p.name + " mışıl mışıl uyuyor 💤 Uyurken acıkmıyor" : emo === "hungry" ? p.name + " acıkmış, onu besle " + food[0] : emo === "sad" ? p.name + " biraz üzgün, onu sev 🥺" : isBedtime() ? p.name + " uykulu, uyku vakti geldi 🌙" : p.name + " şu an " + EMO_TEXT[emo];

  const main = h("section", { class: "card pet-main span-8" },
    h("div", { class: "pet-head" },
      h("input", { class: "pet-name", id: "petName", type: "text", value: p.name, maxlength: "16", "aria-label": "Petinin adı",
        onchange: e => { p.name = e.target.value.trim() || p.name; savePet(); render(); } }),
      h("span", { class: "pet-lv", text: PET_SPECIES[p.species] + ", " + st[1] }),
      h("span", { class: "coins", text: "🪙 " + p.coins })),
    stage,
    h("p", { class: "pet-mood", text: status }),
    h("div", { class: "needs" },
      needBar("Tokluk", n.hunger, n.hunger < 30 ? "low" : ""),
      needBar("Sevgi", n.love, n.love < 30 ? "low" : ""),
      needBar("Büyüme", nx ? Math.round((p.xp - st[0]) / (nx[0] - st[0]) * 100) : 100, "grow")),
    h("p", { class: "tag", style: "text-align:center;margin:.3rem 0 0", text: nx ? nx[1] + " olmasına " + (nx[0] - p.xp) + " puan kaldı" : "Kocaman oldu! 🌈" }),
    h("div", { class: "row", style: "justify-content:center;margin-top:1rem" },
      p.sleeping ? null : h("button", { class: "btn primary", type: "button", text: "Besle " + food[0], onclick: () => feedPet(stage) }),
      p.sleeping ? null : h("button", { class: "btn", type: "button", text: "Sev 💗", onclick: () => lovePet(stage) }),
      h("button", { class: "btn" + (p.sleeping || isBedtime() ? " primary" : ""), type: "button", text: p.sleeping ? "Uyandır ☀️" : "Uyut 🌙", onclick: () => p.sleeping ? wakePet() : sleepPet() }),
      h("button", { class: "btn", type: "button", text: p.partner ? "Paylaşılıyor 💞" : "Paylaş 💞", onclick: choosePartner }))
  );

  const doneN = dailyDone(p);
  const tasks = card({ title: "Günlük görevler " + doneN + "/" + DAILY.length, icon: "star", span: "span-4", tint: "t-lilac",
    body: [h("ul", { class: "pet-tasks" }, DAILY.map(([k, label]) => {
      const ok = (p.day.got[k] || 0) > 0;
      return h("li", { class: ok ? "done" : "" }, h("span", { text: (ok ? "✓ " : "○ ") + label }), h("small", { text: "+" + PET_TASKS.find(t => t[0] === k)[2] }));
    })),
    h("p", { class: "tag", style: "margin-top:.7rem", text: doneN === DAILY.length ? "Hepsi tamam! Bonus +30 kazandın 🎉" : "Hepsini bitirirsen +30 bonus ve buluşma 💞" }),
    h("p", { class: "tag", style: "margin-top:.3rem", text: "Plan, alışkanlık, anı ve arkadaş sevgisi de ekstra puan kazandırır." })] });

  const shop = card({ title: "Gardırop ve mağaza", icon: "gift", span: "span-12",
    body: [h("p", { class: "empty", text: "Puanlarınla aksesuar al, istediğini giydir. Puanın: 🪙 " + p.coins }),
      h("div", { class: "wardrobe" }, PET_SHOP.map(([k, label, slot, price]) => {
        const owned = p.owned.includes(k), on = p.wear[slot] === k;
        const preview = Object.assign({}, p.wear, { [slot]: k });
        return h("div", { class: "ward" + (on ? " on" : "") + (!owned && p.coins < price ? " locked" : "") },
          h("span", { class: "ward-pic", html: petSVG({ species: p.species, color: p.color, emotion: "happy", wear: preview }) }),
          h("small", { text: label }),
          h("span", { class: "tag", text: PET_SLOTS[slot] }),
          owned
            ? h("button", { class: "btn small" + (on ? "" : " primary"), type: "button", text: on ? "Çıkar" : "Giydir", onclick: () => { p.wear[slot] = on ? "" : k; savePet(); render(); } })
            : h("button", { class: "btn small primary", type: "button", text: "Al 🪙 " + price, disabled: p.coins < price, onclick: async () => {
                if (!(await ask({ title: label + " alınsın mı?", text: price + " puan harcanacak. Kalan puanın: " + (p.coins - price), ok: "Satın al", icon: "gift" }))) return;
                p.coins -= price; p.owned.push(k); p.wear[slot] = k; savePet(); render();
                showToast(p.name + " " + label.toLowerCase() + " ile çok tatlı oldu! 🎀");
              } }));
      }))] });

  const look = card({ title: "Görünüm ve efekt", icon: "star", span: "span-12", tint: "t-peach",
    body: [
      h("h3", { class: "form-title", text: "Renk" }),
      h("div", { class: "swatches" }, PET_COLORS[p.species].map(([hex, label]) =>
        h("button", { type: "button", class: "swatch" + (p.color === hex ? " on" : ""), title: label, "aria-label": label, style: "--c:" + hex, onclick: () => { p.color = hex; savePet(); render(); } }))),
      h("h3", { class: "form-title", style: "margin-top:1rem", text: "Etrafına saçılan efekt" }),
      h("div", { class: "fx-pick" }, PET_EFFECTS.map(([e, label]) =>
        h("button", { type: "button", class: "fx" + ((p.effect || "") === e ? " on" : ""), onclick: () => { p.effect = e; savePet(); render(); } }, h("span", { text: e || "🚫" }), h("small", { text: label })))),
      h("div", { class: "row", style: "margin-top:1rem" },
        h("button", { class: "btn small", type: "button", text: p.species === "bunny" ? "Ayıcığa geç 🐻" : "Tavşana geç 🐰", onclick: async () => {
          if (!(await ask({ title: "Dostunu değiştirmek ister misin?", text: "Puanın, aksesuarların ve büyüklüğü aynı kalır, sadece türü değişir.", ok: "Değiştir", icon: "heart" }))) return;
          p.species = p.species === "bunny" ? "bear" : "bunny"; p.color = PET_COLORS[p.species][0][0]; savePet(); render();
        } }))
    ] });

  const friends = profiles.filter(f => f.pet && f.pet.species);
  const friendsCard = card({ title: "Arkadaşlarının petleri", icon: "users", span: "span-12",
    body: [friends.length ? h("div", { class: "pet-friends" }, friends.map(f => {
      const fp = f.pet;
      const sent = listOf("petheart").some(x => isMine(x) && x.to === f.uid && x.date === todayKey);
      const v = petView(fp, { emotion: otherEmotion(fp), scale: .8 });
      return h("div", { class: "pet-friend", "data-fx": fp.effect || "" }, h("div", { class: "pet-stage mini" }, v.wrap),
        h("strong", { text: fp.name || "Pet" }),
        h("small", { text: f.name + ", " + PET_SPECIES[fp.species] + ", " + petStage(fp.xp || 0)[1] + (fp.partner === me.uid ? " 💞" : "") }),
        h("button", { class: "btn small" + (sent ? "" : " primary"), type: "button", text: sent ? "Sevildi 💗" : (fp.name || "Pet") + "'i sev 💗", disabled: sent, onclick: () => sendPetHeart(f) }));
    })) : h("p", { class: "empty", text: "Arkadaşların petlerini seçince burada görünecek." })] });

  const sharedWithMe = profiles.filter(f => f.pet && f.pet.partner === me.uid && p.partner !== f.uid);
  const invite = sharedWithMe.length ? h("section", { class: "card span-12 invite" },
    h("p", { text: sharedWithMe.map(f => f.name).join(", ") + " petini seninle paylaştı 💞" }),
    h("button", { class: "btn primary small", type: "button", text: "Ben de paylaşayım", onclick: () => { p.partner = sharedWithMe[0].uid; savePet(); render(); } })) : null;

  return h("div", {},
    pageHead("Petim", "Sen kendine iyi baktıkça " + p.name + " de mutlu oluyor ve büyüyor."),
    h("div", { class: "grid" }, invite, main, tasks, meetingCard(p), shop, look, friendsCard)
  );
}

function petCarePrompt() {
  if (!me || !$("dialog") || !$("dialog").hidden) return;
  const p = myPet();
  let last = 0;
  try { last = Number(localStorage.getItem("neriii-pet-prompt") || 0); } catch (e) {}
  if (Date.now() - last < 3 * 3600000) return;
  const n = petNeeds(p);
  const hr = new Date().getHours();
  const morning = p.sleeping && hr >= 6 && hr < 13;
  const bedtime = !p.sleeping && isBedtime();
  if (p.species && !morning && !bedtime && (p.sleeping || (n.hunger >= 60 && n.love >= 60))) return;
  try { localStorage.setItem("neriii-pet-prompt", String(Date.now())); } catch (e) {}
  const root = $("dialog");
  const close = () => { root.classList.remove("show"); setTimeout(() => { root.hidden = true; root.replaceChildren(); }, 160); };
  if (!p.species) {
    root.replaceChildren(h("div", { class: "dlg-back", onclick: close }),
      h("div", { class: "dlg dlg-wide pet-prompt", role: "dialog", "aria-modal": "true", "aria-label": "Yeni dostun" },
        h("div", { class: "pet-duo" }, h("span", { html: petSVG({ species: "bunny", emotion: "love" }) }), h("span", { html: petSVG({ species: "bear", emotion: "love" }) })),
        h("h2", { text: "Minik bir dost seni bekliyor!" }),
        h("p", { text: "Bir tavşan ya da ayıcık seç, ona baktıkça büyüsün 🐰🐻" }),
        h("div", { class: "dlg-actions" }, h("button", { class: "btn", type: "button", text: "Sonra", onclick: close }), h("button", { class: "btn primary", type: "button", text: "Hadi seçelim", onclick: () => { close(); go("pet"); } }))));
  } else if (morning || bedtime) {
    const box = h("div", { class: "pet-stage" + (p.sleeping ? " night" : "") }, petView(p, { scale: .85 }).wrap);
    root.replaceChildren(h("div", { class: "dlg-back", onclick: close }),
      h("div", { class: "dlg dlg-wide pet-prompt", role: "dialog", "aria-modal": "true", "aria-label": p.name },
        box,
        h("h2", { text: morning ? "Günaydın! ☀️" : p.name + "'in uykusu geldi 😴" }),
        h("p", { text: morning ? p.name + " hâlâ uyuyor. Uyandıralım mı?" : "Sen de uyumadan önce onu uyutalım mı? Uyurken acıkmaz 🌙" }),
        h("div", { class: "dlg-actions" },
          h("button", { class: "btn", type: "button", text: "Sonra", onclick: close }),
          h("button", { class: "btn primary", type: "button", text: morning ? "Uyandır ☀️" : "Uyut 🌙", onclick: () => { close(); morning ? wakePet() : sleepPet(); } }))));
  } else {
    const food = PET_FOOD[p.species];
    const hungry = n.hunger < 60;
    const box = h("div", { class: "pet-stage" }, petView(p, { scale: .85 }).wrap);
    root.replaceChildren(h("div", { class: "dlg-back", onclick: close }),
      h("div", { class: "dlg dlg-wide pet-prompt", role: "dialog", "aria-modal": "true", "aria-label": p.name },
        box,
        h("h2", { text: hungry ? p.name + " acıkmış! " + food[0] : p.name + " seni özledi 🥺" }),
        h("p", { text: hungry ? p.name + "'i besle, sonra biraz sev ♡" : "Biraz sevgiye ihtiyacı var, sarıl ona 🤗" }),
        h("div", { class: "dlg-actions" },
          h("button", { class: "btn", type: "button", text: "Sev 💗", onclick: () => { lovePet(box); setTimeout(close, 1200); } }),
          h("button", { class: "btn primary", type: "button", text: "Besle " + food[0], onclick: () => { feedPet(box); setTimeout(close, 1200); } }))));
  }
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add("show"));
}

setInterval(() => {
  if (document.hidden) return;
  document.querySelectorAll(".pet-stage, .meet-scene, .pet-friend").forEach(st => {
    const fx = st.getAttribute("data-fx");
    if (fx && Math.random() < .7) {
      for (let i = 0; i < 2; i++) {
        const s = h("i", { class: "pet-fx", text: fx, style: "left:" + (15 + Math.random() * 70) + "%;--d:" + (i * .4) + "s" });
        st.append(s);
        setTimeout(() => s.remove(), 3200);
      }
    }
  });
  document.querySelectorAll(".pet-wrap").forEach(w => {
    if (Math.random() < .35 && !w.classList.contains("hop")) {
      const a = ["wiggle", "tilt", "bounce"][Math.floor(Math.random() * 3)];
      w.classList.add(a);
      setTimeout(() => w.classList.remove(a), 1100);
    }
  });
}, 2800);

function framePickerCard() {
  const mine = profileOf(me.uid) || { name: me.name, photo: me.photo, frame: me.frame };
  return card({ title: "Profil çerçevem", icon: "heart", span: "span-12", tint: "t-blush",
    body: [h("p", { class: "empty", text: "Profil resminin etrafına sevimli bir çerçeve seç. Mesajlarda ve profil listesinde herkes görür." }),
      h("div", { class: "frame-grid" }, FRAMES.map(([k, label]) =>
        h("button", { type: "button", class: "frame-opt" + ((mine.frame || "") === k ? " on" : ""), onclick: async () => {
          try { await db.collection("profiles").doc(me.uid).update({ frame: k }); me.frame = k; updateHeader(); render(); }
          catch (e) { showToast("Kaydedilemedi", "İnternet bağlantını kontrol et."); }
        } }, avatar(Object.assign({}, mine, { frame: k })), h("small", { text: label }))))] });
}
