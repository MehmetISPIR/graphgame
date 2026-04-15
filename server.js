// =============================================================================
// graphgame sunucusu — çok odalı, çok oyunculu matematik tahmin oyunu
// =============================================================================
// AKIŞ ÖZETİ:
//   1. Client index.html'de isim+oda girer, game.html'e yönlenir.
//   2. game.html socket bağlantısında "join" emit eder → server ensureRoom + user ekle.
//   3. Odada 2 kişi olunca startGameIfReady otomatik gameStart çağırır.
//   4. State machine: LOBBY → ROUND → INTERMISSION → ROUND ... → GAME_OVER
//      ROUND: ressam çizer, diğerleri "guess" atar. Bilen olursa veya süre
//      dolarsa endRound. INTERMISSION: kısa ara. Tüm oyuncular çizince set biter.
//      loopSets=true ise yeni set başlar, değilse GAME_OVER.
//   5. Disconnect olunca hemen silinmez — GRACE_MS penceresi açılır; oyuncu
//      geri dönerse seamless devam, dönmezse kesin çıkartılır.
//
// ÖLÜ/YARIM KOD NOTLARI (güvenlik/config UI'sı hiç yapılmadı):
//   - ensureRoom'un isPrivate/maxUsers parametreleri — UI'dan gönderilmiyor,
//     hep default (isPrivate=false, maxUsers=6).
//   - "create" handler'ı — "join" zaten ensureRoom çağırıyor, bu duplike.
//   - "game:start" handler'ı ve gameStart(options) — manuel başlatma/özel
//     tur süresi için planlandı, UI yapılmadı, hiç emit edilmiyor.
//   - cfg.roundSec/interSec/loopSets — oda başına özelleştirilebilir değerler,
//     ama özelleştirme yolu kapalı; hep 180s / 2s / true.
//   - "game:end" + "gameOver" çift emit — yeni event ismine migration yarım
//     kaldı, client'lar "gameOver" dinliyor. Yeni event boşa gidiyor.
//   - "round:end" reason ("timeout"/"guessed") — client reason'u kullanmıyor,
//     sadece kelimeyi gösteriyor.
// =============================================================================

const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require("path");

// ---- TRAFİK DEDEKTİFİ V2 (HAYALET AVCISI) ----

function getVisitorType(userAgent) {
    if (!userAgent) return "❓ BOT (User-Agent Yok)"; // Agent yoksa kesin bottur
    if (userAgent.includes("Googlebot") || userAgent.includes("bingbot") || userAgent.includes("crawler")) {
      return "🤖 ARAMA MOTORU";
    }
    if (userAgent.includes("Mozilla") && !userAgent.includes("compatible")) {
      return "👤 İNSAN (Muhtemelen)";
    }
    return "👾 SCANNER/BOT"; // Ne olduğu belirsiz tarayıcılar
}

app.use((req, res, next) => {
    // ARTIK FİLTRE YOK! Her isteği yakalıyoruz.
    // Ancak statik dosyaları (resim, css) logu kirletmemesi için hariç tutabiliriz.
    if ( !req.path.includes('.css') && !req.path.includes('.js') && !req.path.includes('.png') && !req.path.includes('.ico')) {
        
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.get('User-Agent') || "";
        const visitorType = getVisitorType(userAgent);
        const time = new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul' });
        
        console.log(`\n--- [${time}] UYANDIRMA SERVİSİ ---`);
        console.log(`📡 İstek Yolu: ${req.path}`); // Nereye girmeye çalışıyor?
        console.log(`🕵️ Tip: ${visitorType}`);
        console.log(`📱 Agent: ${userAgent.substring(0, 50)}...`);
    }
    next();
});

// 📽 Public klasör
app.use(express.static(path.join(__dirname, "public")));

// ---- ODA DURUMU ----
// Bellek içi oda tablosu. Sunucu yeniden başlarsa her şey uçar — persistence yok.
// Her Room objesi: { graphs, users[], word, inGame, scores, currentPainter,
//   paintersDone, timers, state, cfg, roundStartTime, disconnectTimers, ... }
const rooms = new Map(); // roomId => Room

// Bağlantı kopması sonrası kullanıcıyı odada ne kadar süre tutacağımız (ms).
// Dil değiştirme, F5, kısa ağ hıçkırığı bu pencerede yeniden bağlandığında sorunsuz devam eder.
const GRACE_MS = 10000;

// Çok dilli kelime havuzu — her öğe { tr, en, hi } objesidir.
// Çizen oyuncu kendi dilinde kelimeyi görür, tahminler her dildeki karşılığı kabul eder.
const WORDS = [
  { tr: "gözlük",    en: "glasses",    hi: "चश्मा" },
  { tr: "saat",      en: "watch",      hi: "घड़ी" },
  { tr: "balon",     en: "balloon",    hi: "गुब्बारा" },
  { tr: "dağ",       en: "mountain",   hi: "पहाड़" },
  { tr: "bardak",    en: "glass",      hi: "गिलास" },
  { tr: "bayrak",    en: "flag",       hi: "झंडा" },
  { tr: "köprü",     en: "bridge",     hi: "पुल" },
  { tr: "anahtar",   en: "key",        hi: "चाबी" },
  { tr: "şemsiye",   en: "umbrella",   hi: "छाता" },
  { tr: "makas",     en: "scissors",   hi: "कैंची" },
  { tr: "yelkenli",  en: "sailboat",   hi: "नाव" },
  { tr: "kelebek",   en: "butterfly",  hi: "तितली" },
  { tr: "gitar",     en: "guitar",     hi: "गिटार" },
  { tr: "kum saati", en: "hourglass",  hi: "रेत घड़ी" },
  { tr: "mıknatıs",  en: "magnet",     hi: "चुंबक" },
  { tr: "çapa",      en: "anchor",     hi: "लंगर" },
  { tr: "ok",        en: "arrow",      hi: "तीर" },
  { tr: "uçurtma",   en: "kite",       hi: "पतंग" },
  { tr: "kulaklık",  en: "headphones", hi: "हेडफ़ोन" },
  { tr: "fener",     en: "lantern",    hi: "लालटेन" },
  { tr: "ay",        en: "moon",       hi: "चाँद" },
  { tr: "yay",       en: "bow",        hi: "धनुष" },
  { tr: "gözyaşı",   en: "teardrop",   hi: "आँसू" },
  { tr: "kitaplık",  en: "bookshelf",  hi: "किताबों की अलमारी" },
  { tr: "balık",     en: "fish",       hi: "मछली" },
  { tr: "tren",      en: "train",      hi: "ट्रेन" },
  { tr: "lamba",     en: "lamp",       hi: "दीपक" },
];

function pickRandomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

// Tahmin kontrolü: kelime objesindeki herhangi bir dildeki karşılık eşleşirse doğru sayar.
function wordMatches(word, guess) {
  if (!word || guess == null) return false;
  const g = String(guess).toLowerCase().trim();
  if (typeof word === "string") return word.toLowerCase().trim() === g;
  return Object.values(word).some(
    (w) => typeof w === "string" && w.toLowerCase().trim() === g
  );
}

// Lobi'deki herkese güncel oda listesini yollar. Her oda değişiminde (join/disconnect/
// grace/remove) çağrılır. isPrivate filtresi var ama hiçbir oda private değil (ölü kod).
function broadcastRoomList() {
  const list = Array.from(rooms.entries())
    .filter(([_, r]) => !r.isPrivate)
    .map(([name, r]) => ({
      name,
      inGame: r.inGame,
      userCount: r.users.length,
      hasPainter: !!r.currentPainter,
      isWaiting: !r.inGame && r.users.length < 2,
      isFull: r.users.length >= r.maxUsers,
    }));
  io.emit("roomList", list);
}

// ---- Durum makinesi yardımcıları ----
// Oda yoksa yaratır, varsa olanı döndürür. isPrivate/maxUsers parametreleri şu an
// kullanılmıyor (UI özelleştirme yolu yok), default değerlerle gider.
function ensureRoom(roomId, { isPrivate = false, maxUsers = 6 } = {}) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      graphs: [],                  // O turda çizilmiş grafik listesi (ressam ekler)
      users: [],                   // [{ id, name, role, disconnected }]
      word: "",                    // { tr, en, hi } — ressama verilen kelime objesi
      inGame: false,               // true: ROUND/INTERMISSION akışı aktif
      isPrivate,                   // ÖLÜ: hep false, UI yok
      maxUsers,                    // ÖLÜ özelleştirme ama join'de limit olarak kullanılıyor
      scores: {},                  // name -> points (oda ömrü boyunca birikir)
      paintersDone: new Set(),     // O sette çizmiş oyuncu id'leri (set = tur döngüsü)
      currentPainter: null,        // Aktif ressamın socket.id'si
      timers: { round: null, inter: null }, // setTimeout handle'ları
      state: "LOBBY",              // LOBBY | ROUND | INTERMISSION | GAME_OVER
      cfg: { roundSec: 180, interSec: 2, loopSets: true }, // ÖLÜ özelleştirme
      roundStartTime: null,        // Client'lar saate göre kendi geri sayımını hesaplar
      disconnectTimers: new Map(), // userId -> Timeout (grace pencere timerları)
    });
  }
  return rooms.get(roomId);
}

function clearTimers(r) {
  if (!r) return;
  clearTimeout(r.timers?.round);
  clearTimeout(r.timers?.inter);
  r.timers = r.timers || { round: null, inter: null };
}

// Grace timer iptali (kullanıcı yeniden bağlandığında veya kesin çıkartılırken).
function cancelGraceRemoval(r, userId) {
  if (!r || !r.disconnectTimers) return;
  const t = r.disconnectTimers.get(userId);
  if (t) {
    clearTimeout(t);
    r.disconnectTimers.delete(userId);
  }
}

// Kullanıcıyı odadan kesin olarak çıkartır. Ressamsa turu kapatır, oda boşalırsa siler.
// Hem disconnect sonrası grace süresi dolunca, hem de aktif olarak başka odaya geçişte çağrılır.
function removeUserFromRoom(roomName, userId) {
  const r = rooms.get(roomName);
  if (!r) return;
  const index = r.users.findIndex((u) => u.id === userId);
  if (index === -1) return;

  const wasPainter = r.currentPainter === userId;
  r.users.splice(index, 1);
  r.paintersDone.delete(userId);
  cancelGraceRemoval(r, userId);

  if (r.users.length === 0) {
    clearTimers(r);
    for (const t of r.disconnectTimers.values()) clearTimeout(t);
    r.disconnectTimers.clear();
    rooms.delete(roomName);
    broadcastRoomList();
    return;
  }

  io.to(roomName).emit("users", r.users);

  // Aktif (grace'te olmayan) oyuncu sayısı kritik eşiğin altına düştü mü?
  const activeCount = r.users.filter((u) => !u.disconnected).length;

  if (activeCount < 2) {
    if (r.inGame) {
      clearTimers(r);
      r.inGame = false;
      r.state = "GAME_OVER";
      r.currentPainter = null;
      r.roundStartTime = null;
      r.paintersDone.clear();
      io.to(roomName).emit("gameOver", r.scores);
      io.to(roomName).emit("game:end", { scores: r.scores });
    }
  } else if (wasPainter && r.inGame) {
    endRound(roomName, "timeout");
  }
  broadcastRoomList();
}

// Kullanıcıyı "disconnected" işaretler ve grace süresi sonunda kesin çıkartacak timer kurar.
// Grace içinde yeniden bağlanırsa cancelGraceRemoval + flag sıfırlama ile sorunsuz devam eder.
function scheduleGraceRemoval(roomName, userId) {
  const r = rooms.get(roomName);
  if (!r) return;
  const user = r.users.find((u) => u.id === userId);
  if (!user) return;

  user.disconnected = true;
  cancelGraceRemoval(r, userId);
  const timer = setTimeout(() => {
    const r2 = rooms.get(roomName);
    if (!r2) return;
    const u = r2.users.find((x) => x.id === userId);
    if (!u || !u.disconnected) return; // bu arada yeniden bağlanmış
    removeUserFromRoom(roomName, userId);
  }, GRACE_MS);
  r.disconnectTimers.set(userId, timer);

  io.to(roomName).emit("users", r.users);
  broadcastRoomList();
}

function emitGameState(roomId) {
  const r = rooms.get(roomId);
  if (!r) return;
  io.to(roomId).emit("game:state", {
    state: r.state,
    room: roomId,
    players: r.users,
    scores: r.scores,
  });
}

// ---- Ana giriş ----
// Oyunu LOBBY'den ROUND state'ine sokar. options parametresi manuel başlatma için
// planlandı (roundSec/interSec/loopSets override'ı) ama hiç emit edilmediğinden ÖLÜ.
// Otomatik çağrı: startGameIfReady → 2 oyuncu olunca buraya düşer.
function gameStart(roomId, options = {}) {
  const r = rooms.get(roomId);
  if (!r) return;
  // ÖLÜ KOD — hiçbir yerden options gönderilmiyor, bu blok hep atlanıyor:
  if (options && typeof options === "object") {
    if (Number.isFinite(options.roundSec) && options.roundSec >= 10 && options.roundSec <= 600) {
      r.cfg.roundSec = options.roundSec;
    }
    if (Number.isFinite(options.interSec) && options.interSec >= 0 && options.interSec <= 30) {
      r.cfg.interSec = options.interSec;
    }
    if (typeof options.loopSets === "boolean") r.cfg.loopSets = options.loopSets;
  }
  r.inGame = true;
  r.state = "ROUND";
  r.paintersDone.clear();
  emitGameState(roomId);
  startRound(roomId);
}

// ---- Tur başlat / bitir ----
// Bir tur = bir ressamın çizip diğerlerinin tahmin ettiği süre. Her tur başında:
// - henüz çizmemiş birini rastgele seç, ona ressam rolü ver, kelime ata
// - herkese newGame emit et (roller + süre bilgisi)
// - ressama wordForPainter (kelime objesi)
// - roundSec sonra endRound("timeout")
// Bütün oyuncular çizdiğinde "set" biter: loopSets ise yeniden, değilse GAME_OVER.
function startRound(roomId) {
  const r = rooms.get(roomId);
  if (!r || !r.inGame) return;

  // Adaylar: bu sette henüz çizmeyenler
  const candidates = r.users.filter((u) => !r.paintersDone.has(u.id));

  // Aday yoksa set bitti
  if (candidates.length === 0) {
    if (r.cfg.loopSets && r.users.length >= 2) {
      r.paintersDone.clear();
      return startRound(roomId); // yeni setin ilk turu
    } else {
      r.state = "GAME_OVER";
      r.inGame = false;
      clearTimers(r);
      io.to(roomId).emit("gameOver", r.scores); // GERİYE UYUMLU
      io.to(roomId).emit("game:end", { scores: r.scores }); // yeni event
      broadcastRoomList();
      return;
    }
  }

  // Ressamı seç
  const next = candidates[Math.floor(Math.random() * candidates.length)];
  r.currentPainter = next.id;
  r.paintersDone.add(next.id);
  r.users.forEach((u) => (u.role = u.id === next.id ? "painter" : "viewer"));

  // Kelime ve tuval
  r.word = pickRandomWord();
  r.graphs = [];

  // Round başlangıç zamanını kaydet
  r.roundStartTime = Date.now();

  // Client bilgilendirme
  r.state = "ROUND";
  emitGameState(roomId);

  // Client'lara round bilgisini gönder (süre bilgileriyle)
  io.to(roomId).emit("newGame", { 
    room: roomId, 
    roles: r.users,
    roundStartTime: r.roundStartTime,  // Başlangıç zamanı
    roundDuration: r.cfg.roundSec       // Toplam süre (saniye)
  });
  io.to(next.id).emit("wordForPainter", r.word);

  // Round timer
  clearTimeout(r.timers.round);
  r.timers.round = setTimeout(() => endRound(roomId, "timeout"), r.cfg.roundSec * 1000);
}

// Turu kapatır ve INTERMISSION (kısa ara) state'ine geçer. reason: "guessed" |
// "timeout". Client bunu kullanmıyor (sadece kelimeyi gösteriyor) — reason ÖLÜ FIELD.
// Ara bitince startRound ile bir sonraki tura geçer, ya da < 2 oyuncu kaldıysa GAME_OVER.
function endRound(roomId, reason) {
  const r = rooms.get(roomId);
  if (!r) return;
  clearTimeout(r.timers.round);

  // Round başlangıç zamanını temizle
  r.roundStartTime = null;

  // GERİYE UYUMLU: eski akış kelimeyi tur sonunda göstermek istiyorsa
  io.to(roomId).emit("round:end", { reason, word: r.word, scores: r.scores });

  // Kısa ara
  r.state = "INTERMISSION";
  emitGameState(roomId);

  clearTimeout(r.timers.inter);
  r.timers.inter = setTimeout(() => {
    if (!r.inGame || r.users.length < 2) {
      r.state = "GAME_OVER";
      r.inGame = false;
      io.to(roomId).emit("gameOver", r.scores); // GERİYE UYUMLU
      io.to(roomId).emit("game:end", { scores: r.scores });
      broadcastRoomList();
      return;
    }
    startRound(roomId);
  }, r.cfg.interSec * 1000);
}

// ---- LOBBY kontrolü ----
function startGameIfReady(roomId) {
  const r = rooms.get(roomId);
  if (!r || r.inGame) return;
  if (r.users.length >= 2) {
    gameStart(roomId);
    broadcastRoomList();
  }
}

// ---- Socket IO ----
// Client event haritası (hangi event ne işe yarar):
//   create     → ÖLÜ: game.html her connect'te emit ediyor ama join zaten ensureRoom
//                çağırdığı için redundant. Silme adayı.
//   join       → Odaya girer/geri döner. Grace reconnect + ghost kick burada.
//   addGraph   → Ressam yeni grafik gönderir, herkese broadcast.
//   clearCanvas → Ressam tuvali temizler.
//   guess      → Oyuncu tahmin atar. Doğruysa +10 puan + endRound.
//   getRooms   → Lobi oda listesi talebi.
//   game:start → ÖLÜ: client hiç emit etmiyor, manuel başlatma UI'sı yok.
//   disconnect → Grace penceresi başlatır.
io.on("connection", (socket) => {
  console.log(`Yeni bağlantı: ${socket.id}`);

  // ÖLÜ HANDLER — game.html her connect'te bunu emit ediyor ama join de aynı işi
  // yapıyor. isPrivate/maxUsers parametreleri crafted mesajla suistimal edilebilir.
  socket.on("create", ({ room, isPrivate = false, maxUsers = 6 }) => {
    const r = ensureRoom(room, { isPrivate, maxUsers });
    socket.join(room);
    broadcastRoomList();
  });

  socket.on("join", ({ room, user }) => {
    if (!room || !user || !user.name) {
      socket.emit("errorMsg", { code: "invalid_join" });
      return;
    }
    const name = String(user.name).trim().slice(0, 32);
    if (!name) {
      socket.emit("errorMsg", { code: "invalid_join" });
      return;
    }

    // Bu socket başka bir odadaysa önce oradan kesin çık (grace yok — kasıtlı oda değişimi).
    for (const [otherName, otherRoom] of rooms.entries()) {
      if (otherName === room) continue;
      if (otherRoom.users.some((u) => u.id === socket.id)) {
        socket.leave(otherName);
        removeUserFromRoom(otherName, socket.id);
      }
    }

    const r = ensureRoom(room);

    // Aynı isimde bir kullanıcı var mı?
    const existing = r.users.find((u) => u.name === name);
    if (existing) {
      // İki senaryo: (a) grace süresinde yeniden bağlanma — temiz restore,
      // (b) aynı isimle aktif başka bir oturum varken yeni bağlantı — ghost kick.
      const oldId = existing.id;
      if (existing.disconnected) {
        cancelGraceRemoval(r, oldId);
        existing.disconnected = false;
      } else if (existing.id !== socket.id) {
        // F5/çift sekme: eski aktif soketi zorla kov.
        const oldSocket = io.sockets.sockets.get(existing.id);
        if (oldSocket) oldSocket.disconnect(true);
      }

      if (existing.id !== socket.id) {
        existing.id = socket.id;
        if (r.currentPainter === oldId) r.currentPainter = socket.id;
        if (r.paintersDone.has(oldId)) {
          r.paintersDone.delete(oldId);
          r.paintersDone.add(socket.id);
        }
      }
    } else {
      if (r.users.length >= r.maxUsers) {
        socket.emit("errorMsg", { code: "room_full" });
        return;
      }
      r.users.push({ id: socket.id, name, role: "viewer", disconnected: false });
      if (r.scores[name] == null) r.scores[name] = 0;
    }

    socket.join(room);
    socket.emit("graphs", r.graphs);
    io.to(room).emit("users", r.users);

    // Devam eden oyuna katılıyorsa
    if (r.inGame && r.currentPainter && r.roundStartTime) {
      socket.emit("newGame", {
        room,
        roles: r.users,
        roundStartTime: r.roundStartTime,
        roundDuration: r.cfg.roundSec,
      });

      if (socket.id === r.currentPainter) {
        socket.emit("wordForPainter", r.word);
      }
    }

    startGameIfReady(room);
    broadcastRoomList();
  });

  socket.on("addGraph", ({ room, graph }) => {
    const r = rooms.get(room);
    if (!r || r.currentPainter !== socket.id) return;
    if (!graph || typeof graph !== "object") return;
    if (typeof graph.expr !== "string" || !graph.expr.length || graph.expr.length > 200) return;
    if (r.graphs.length >= 100) return;

    // Yalnızca güvenli alanları kopyala — client ne gönderirse göndersin
    const clean = {
      type: typeof graph.type === "string" ? graph.type : "explicit",
      expr: graph.expr,
      xmin: Number.isFinite(graph.xmin) ? graph.xmin : -10,
      xmax: Number.isFinite(graph.xmax) ? graph.xmax : 10,
      dx: Number.isFinite(graph.dx) ? graph.dx : 0,
      dy: Number.isFinite(graph.dy) ? graph.dy : 0,
      theta: Number.isFinite(graph.theta) ? graph.theta : 0,
      color: typeof graph.color === "string" && graph.color.length <= 32 ? graph.color : "#b00",
    };
    r.graphs.push(clean);
    io.to(room).emit("graphs", r.graphs);
  });

  socket.on("clearCanvas", ({ room }) => {
    const r = rooms.get(room);
    if (!r || r.currentPainter !== socket.id) return;

    r.graphs = [];
    io.to(room).emit("clearCanvas");
  });

  socket.on("guess", ({ room, guess }) => {
    const r = rooms.get(room);
    if (!r || !r.inGame || r.currentPainter === socket.id) return;

    const user = r.users.find((u) => u.id === socket.id);
    if (!user) return;

    if (wordMatches(r.word, guess)) {
      r.scores[user.name] = (r.scores[user.name] || 0) + 10;
      io.to(room).emit("guessResult", {
        correct: true,
        word: r.word,
        scores: r.scores,
        guesser: user.name,
      });
      endRound(room, "guessed");
    } else {
      socket.emit("guessResult", { correct: false });
    }
  });

  socket.on("getRooms", () => {
    broadcastRoomList();
  });

  // ÖLÜ HANDLER — manuel başlatma + tur süresi override'ı için planlandı,
  // hiçbir client emit etmiyor. Otomatik başlatma (startGameIfReady) devrede.
  socket.on("game:start", ({ room, options } = {}) => {
    const r = rooms.get(room);
    if (!r) return;
    if (!socket.rooms.has(room)) return;
    if (!r.users.some((u) => u.id === socket.id)) return;
    if (!r.inGame && r.users.length >= 2) gameStart(room, options || {});
  });

  socket.on("disconnect", () => {
    // Hemen silme; grace penceresi başlat. Kullanıcı GRACE_MS içinde yeniden
    // bağlanırsa (dil değiştirme, F5, kısa ağ kopması) kaldığı yerden devam eder.
    // Aksi halde timer dolunca removeUserFromRoom çalışır ve asıl etkiler tetiklenir.
    for (const [name, r] of rooms.entries()) {
      const user = r.users.find((u) => u.id === socket.id);
      if (!user) continue;
      scheduleGraceRemoval(name, socket.id);
    }
  });
});

const port = process.env.PORT || 3000;//from ix1 to world, I tried. 
server.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor`);
});