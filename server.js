const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();

function pickRandomWord() {
  const words = ['elma', 'araba', 'ev', 'kalem', 'masa', 'kitap', 'telefon', 'bilgisayar'];
  return words[Math.floor(Math.random() * words.length)];
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
      isFull: r.users.length >= r.maxUsers
    }));
  io.emit('roomList', list);
}

function pickNextPainter(roomId) {
  const r = rooms.get(roomId);
  if (!r) return;
  clearTimeout(r.timeout);

  const candidates = r.users.filter(u => !r.paintersDone.has(u.id));
  if (candidates.length === 0) {
    io.to(roomId).emit('gameOver', r.scores);
    r.inGame = false;
    r.paintersDone.clear();
    broadcastRoomList();
    return;
  }

  const next = candidates[Math.floor(Math.random() * candidates.length)];
  r.paintersDone.add(next.id);
  r.currentPainter = next.id;

  r.users.forEach(u => {
    u.role = (u.id === next.id) ? 'painter' : 'viewer';
  });

  r.word = pickRandomWord();
  r.graphs = [];

  io.to(roomId).emit('newGame', { room: roomId, roles: r.users, scores: r.scores });
  io.to(next.id).emit('wordForPainter', r.word);

  r.timeout = setTimeout(() => {
    io.to(roomId).emit('roundTimeout', r.word);
    pickNextPainter(roomId);
  }, 180000); // 3 dakika
}

function startGameIfReady(roomId) {
  const r = rooms.get(roomId);
  if (!r || r.inGame) return;
  if (r.users.length >= 2) {
    r.inGame = true;
    pickNextPainter(roomId);
    broadcastRoomList();
  }
}

io.on('connection', (socket) => {
  socket.on('create', ({ room, isPrivate = false, maxUsers = 6 }) => {
    if (!rooms.has(room)) {
      rooms.set(room, {
        graphs: [],
        users: [],
        word: '',
        inGame: false,
        isPrivate,
        maxUsers,
        scores: {},
        paintersDone: new Set(),
        currentPainter: null,
        timeout: null
      });
    }
    socket.join(room);
    broadcastRoomList();
  });

  socket.on('join', ({ room, user }) => {
    const r = rooms.get(room);
    if (!r) return socket.emit('errorMsg', 'Oda bulunamadı');
    if (r.users.length >= r.maxUsers) return socket.emit('errorMsg', 'Oda dolu');

    const already = r.users.find(u => u.id === socket.id);
    if (!already) {
      r.users.push({ id: socket.id, name: user.name, role: 'viewer' });
      r.scores[socket.id] = 0;
      if (r.inGame) r.paintersDone.add(socket.id); // ✔️ yeni gelen sonraki turda dahil olur
    }

    socket.join(room);
    socket.emit('graphs', r.graphs);
    io.to(room).emit('users', r.users);

    if (r.inGame && r.currentPainter) {
      socket.emit('newGame', { room, roles: r.users, scores: r.scores });
      if (socket.id === r.currentPainter) {
        socket.emit('wordForPainter', r.word);
      }
    }

    startGameIfReady(room);
    broadcastRoomList();
  });

  socket.on('addGraph', ({ room, graph }) => {
    const r = rooms.get(room);
    if (!r || r.currentPainter !== socket.id) return;
    r.graphs.push(graph);
    io.to(room).emit('graphs', r.graphs);
  });

  socket.on('clearCanvas', ({ room }) => {
    const r = rooms.get(room);
    if (!r || r.currentPainter !== socket.id) return;
    r.graphs = [];
    io.to(room).emit('clearCanvas');
  });

  socket.on('guess', ({ room, guess }) => {
    const r = rooms.get(room);
    if (!r || !r.inGame || r.currentPainter === socket.id) return;

    const user = r.users.find(u => u.id === socket.id);
    if (!user) return;

    if (r.word.toLowerCase() === guess.toLowerCase()) {
      r.scores[socket.id] += 10;
      io.to(room).emit('guessResult', {
        correct: true,
        word: r.word,
        scores: r.scores,
        guesser: user.name
      });
      clearTimeout(r.timeout);
      setTimeout(() => pickNextPainter(room), 2000);
    } else {
      socket.emit('guessResult', { correct: false });
    }
  });

  socket.on('getRooms', () => {
    broadcastRoomList();
  });

  socket.on('disconnect', () => {
    for (const [name, r] of rooms.entries()) {
      const index = r.users.findIndex(u => u.id === socket.id);
      if (index === -1) continue;

      const wasPainter = r.currentPainter === socket.id;
      r.users.splice(index, 1);
      delete r.scores[socket.id];
      r.paintersDone.delete(socket.id);

      if (r.users.length === 0) {
        clearTimeout(r.timeout);
        rooms.delete(name);
        continue;
      }

      io.to(name).emit('users', r.users);
      if (wasPainter && r.inGame) pickNextPainter(name);
      if (r.users.length < 2 && r.inGame) {
        r.inGame = false;
        clearTimeout(r.timeout);
        io.to(name).emit('gameOver', r.scores);
      }
    }
    broadcastRoomList();
  });
});

const port = process.env.PORT || 3000;//From ix1 to world
server.listen(port, () => {
  console.log(`Sunucu ${port} portunda çalışıyor`);
});
