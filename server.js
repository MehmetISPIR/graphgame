// Çok odalı ve çok oyunculu matematik tahmin oyunu sunucusu (optimal süre senkronizasyonu)

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
const rooms = new Map(); // roomId => Room

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
function ensureRoom(roomId, { isPrivate = false, maxUsers = 6 } = {}) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      graphs: [],
      users: [],
      word: "",
      inGame: false,
      isPrivate,
      maxUsers,
      scores: {},
      paintersDone: new Set(),
      currentPainter: null,
      timers: { round: null, inter: null },
      state: "LOBBY", // LOBBY | ROUND | INTERMISSION | GAME_OVER
      cfg: { roundSec: 180, interSec: 2, loopSets: true },
      roundStartTime: null,  // Round başlangıç zamanı
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
function gameStart(roomId, options = {}) {
  const r = rooms.get(roomId);
  if (!r) return;
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
io.on("connection", (socket) => {
  console.log(`Yeni bağlantı: ${socket.id}`);

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

    // Bu socket başka bir odadaysa önce oradan çık (multi-room önleme)
    for (const [otherName, otherRoom] of rooms.entries()) {
      if (otherName === room) continue;
      const idx = otherRoom.users.findIndex((u) => u.id === socket.id);
      if (idx !== -1) {
        otherRoom.users.splice(idx, 1);
        otherRoom.paintersDone.delete(socket.id);
        socket.leave(otherName);
        io.to(otherName).emit("users", otherRoom.users);
        if (otherRoom.users.length < 2 && otherRoom.inGame) {
          clearTimers(otherRoom);
          otherRoom.inGame = false;
          otherRoom.state = "GAME_OVER";
          otherRoom.currentPainter = null;
          otherRoom.roundStartTime = null;
          otherRoom.paintersDone.clear();
          io.to(otherName).emit("gameOver", otherRoom.scores);
        }
      }
    }

    const r = ensureRoom(room);

    // Aynı isimde bir kullanıcı var mı?
    const existing = r.users.find((u) => u.name === name);
    if (existing) {
      // Eski socket hâlâ bağlı ise gerçek çarpışma → reddet
      const oldSocket = io.sockets.sockets.get(existing.id);
      if (existing.id !== socket.id && oldSocket && oldSocket.connected) {
        socket.emit("errorMsg", { code: "name_taken" });
        return;
      }
      // Aksi halde reconnect: eski kaydın socket.id'sini güncelle
      if (existing.id !== socket.id) {
        const oldId = existing.id;
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
      r.users.push({ id: socket.id, name, role: "viewer" });
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

  // (Opsiyonel) Client manuel başlatmak isterse
  socket.on("game:start", ({ room, options } = {}) => {
    const r = rooms.get(room);
    if (!r) return;
    if (!socket.rooms.has(room)) return;
    if (!r.users.some((u) => u.id === socket.id)) return;
    if (!r.inGame && r.users.length >= 2) gameStart(room, options || {});
  });

  socket.on("disconnect", () => {
    for (const [name, r] of rooms.entries()) {
      const index = r.users.findIndex((u) => u.id === socket.id);
      if (index === -1) continue;

      const wasPainter = r.currentPainter === socket.id;
      r.users.splice(index, 1);
      r.paintersDone.delete(socket.id);

      if (r.users.length === 0) {
        clearTimers(r);
        rooms.delete(name);
        continue;
      }

      io.to(name).emit("users", r.users);

      // Üç olası dal — tam olarak bir tanesi çalışır:
      if (r.users.length < 2) {
        // 1) Yetersiz oyuncu: oyunu doğrudan bitir, ara event yok
        if (r.inGame) {
          clearTimers(r);
          r.inGame = false;
          r.state = "GAME_OVER";
          r.currentPainter = null;
          r.roundStartTime = null;
          r.paintersDone.clear();
          io.to(name).emit("gameOver", r.scores);
          io.to(name).emit("game:end", { scores: r.scores });
        }
      } else if (wasPainter && r.inGame) {
        // 2) Ressam çıktı ama oyun devam edebilir: turu standart şekilde kapat
        endRound(name, "timeout");
      }
      // 3) Normal oyuncu çıkışı, oyun aynen devam eder
    }
    broadcastRoomList();
  });
});

const port = process.env.PORT || 3000;//from ix1 to world, I tried. 
server.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor`);
});
