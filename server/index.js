import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';

import { attemptHostLogin, isHostToken } from './auth.js';
import {
  createRoom,
  getRoom,
  deleteRoom,
  roomExists,
  addItem,
  removeItem,
  setCurrentItemIndex,
  vote,
  reveal,
  resetPoll,
  resetItemVotes,
  setFinal,
  toPublicRoom,
  RCI_DECK,
  EFFORT_DECK,
} from './store.js';

const DECKS = { rci: RCI_DECK, effort: EFFORT_DECK };
import { buildWorkbook } from './exportXlsx.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer);

// ---- REST API ----

app.post('/api/host-login', (req, res) => {
  const { password } = req.body || {};
  const token = attemptHostLogin(password || '');
  if (!token) return res.status(401).json({ error: 'Invalid password' });
  res.json({ token });
});

app.post('/api/rooms', (req, res) => {
  const hostToken = req.header('x-host-token');
  if (!isHostToken(hostToken)) return res.status(403).json({ error: 'Host login required' });
  const room = createRoom(req.body?.name);
  res.json({ id: room.id, name: room.name });
});

app.get('/api/rooms/:id', (req, res) => {
  if (!roomExists(req.params.id)) return res.status(404).json({ error: 'Room not found' });
  res.json({ ok: true });
});

app.get('/api/rooms/:id/export', (req, res) => {
  const hostToken = req.query.token;
  if (!isHostToken(hostToken)) return res.status(403).json({ error: 'Host login required' });
  const room = getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const buffer = buildWorkbook(room);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${room.name.replace(/[^a-z0-9\- _]/gi, '_')}.xlsx"`);
  res.send(buffer);
});

// Serve the built client in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ---- Socket.IO realtime ----

function emitRoom(roomId) {
  const room = getRoom(roomId);
  if (!room) return;
  for (const [socketId, participant] of Object.entries(room.participants)) {
    if (!participant.connected) continue;
    io.to(socketId).emit('room-state', toPublicRoom(room, participant.id));
  }
}

io.on('connection', (socket) => {
  let roomId = null;
  let participantId = null;

  socket.on('join', ({ roomId: rid, name, participantId: pid, isObserver, hostToken }) => {
    const room = getRoom(rid);
    if (!room) {
      socket.emit('join-error', { error: 'Room not found' });
      return;
    }

    roomId = rid;
    participantId = pid || nanoid(10);
    const host = isHostToken(hostToken);

    room.participants[socket.id] = {
      id: participantId,
      socketId: socket.id,
      name: (name || 'Guest').trim().slice(0, 40) || 'Guest',
      isHost: host,
      // The host runs the session and never votes, regardless of the observer checkbox.
      isObserver: host || !!isObserver,
      connected: true,
    };

    socket.join(roomId);
    socket.emit('joined', { participantId, isHost: host });
    emitRoom(roomId);
  });

  function requireHost() {
    const room = getRoom(roomId);
    const p = room?.participants[socket.id];
    return room && p && p.isHost ? room : null;
  }

  socket.on('vote', ({ pollType, value }) => {
    const room = getRoom(roomId);
    if (!room || !participantId) return;
    if (room.participants[socket.id]?.isObserver) return;
    if (!DECKS[pollType]?.includes(value)) return;
    vote(room, participantId, pollType, value);
    emitRoom(roomId);
  });

  socket.on('reveal', ({ pollType }) => {
    const room = requireHost();
    if (!room) return;
    reveal(room, pollType);
    emitRoom(roomId);
  });

  socket.on('reset-poll', ({ pollType }) => {
    const room = requireHost();
    if (!room) return;
    resetPoll(room, pollType);
    emitRoom(roomId);
  });

  socket.on('reset-item', () => {
    const room = requireHost();
    if (!room) return;
    resetItemVotes(room);
    emitRoom(roomId);
  });

  socket.on('set-final', ({ pollType, value }) => {
    const room = requireHost();
    if (!room) return;
    setFinal(room, pollType, value);
    emitRoom(roomId);
  });

  socket.on('add-item', ({ name }) => {
    const room = requireHost();
    if (!room || !name?.trim()) return;
    addItem(room, name.trim());
    emitRoom(roomId);
  });

  socket.on('remove-item', ({ itemId }) => {
    const room = requireHost();
    if (!room) return;
    removeItem(room, itemId);
    emitRoom(roomId);
  });

  socket.on('set-current-item', ({ index }) => {
    const room = requireHost();
    if (!room) return;
    setCurrentItemIndex(room, index);
    emitRoom(roomId);
  });

  socket.on('end-session', () => {
    const room = requireHost();
    if (!room) return;
    io.to(roomId).emit('session-ended');
    deleteRoom(roomId);
  });

  socket.on('disconnect', () => {
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    const p = room.participants[socket.id];
    if (p) p.connected = false;
    emitRoom(roomId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`open-scrum-poker listening on http://localhost:${PORT}`);
});
