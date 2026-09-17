import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';

import { attemptHostLogin, issueHostToken, isHostToken, getHostSession } from './auth.js';
import {
  isAtlassianLoginEnabled,
  createState,
  consumeState,
  buildAuthorizeUrl,
  exchangeCodeForAccessToken,
  fetchAtlassianIdentity,
  isAuthorizedIdentity,
} from './atlassianAuth.js';
import {
  createRoom,
  getRoom,
  deleteRoom,
  roomExists,
  addItem,
  removeItem,
  setCurrentItemIndex,
  canLeaveCurrentItem,
  currentItem,
  vote,
  reveal,
  resetPoll,
  resetItemVotes,
  setFinal,
  upsertParticipant,
  findParticipant,
  toPublicRoom,
} from './store.js';
import { setPresence, clearPresence, entriesForRoom } from './presence.js';

import { buildWorkbook } from './exportXlsx.js';
import { fetchIssue, isJiraConfigured, pushFinalValue, postAttributionComment, getJiraBaseUrl } from './jira.js';

const ENABLE_JIRA_ATTRIBUTION_COMMENT = (process.env.ENABLE_JIRA_ATTRIBUTION_COMMENT || '').trim().toLowerCase() === 'true';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT;

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

app.get('/api/auth/atlassian/config', (req, res) => {
  res.json({ enabled: isAtlassianLoginEnabled() });
});

app.get('/api/auth/atlassian/login', (req, res) => {
  if (!isAtlassianLoginEnabled()) return res.status(404).end();
  try {
    const state = createState();
    res.redirect(buildAuthorizeUrl(state));
  } catch (err) {
    res.status(500).send('Atlassian login is not configured correctly on the server.');
  }
});

app.get('/api/auth/atlassian/callback', async (req, res) => {
  if (!isAtlassianLoginEnabled()) return res.status(404).end();
  const { code, state } = req.query;

  if (!consumeState(state)) {
    return res.redirect('/?atlassianError=invalid_state');
  }

  try {
    const accessToken = await exchangeCodeForAccessToken(code);
    const identity = await fetchAtlassianIdentity(accessToken);

    if (!isAuthorizedIdentity(identity)) {
      return res.redirect('/?atlassianError=unauthorized');
    }

    const token = issueHostToken({
      method: 'atlassian',
      email: identity.email,
      name: identity.name,
      accountId: identity.account_id,
    });
    res.redirect(`/?hostToken=${encodeURIComponent(token)}`);
  } catch (err) {
    res.redirect('/?atlassianError=login_failed');
  }
});

app.post('/api/rooms', async (req, res) => {
  const hostToken = req.header('x-host-token');
  if (!isHostToken(hostToken)) return res.status(403).json({ error: 'Host login required' });
  const room = await createRoom(req.body?.name, req.body?.config);
  res.json({ id: room.id, name: room.name });
});

app.get('/api/rooms/:id', async (req, res) => {
  if (!(await roomExists(req.params.id))) return res.status(404).json({ error: 'Room not found' });
  res.json({ ok: true });
});

app.get('/api/jira-config', (req, res) => {
  res.json({ configured: isJiraConfigured(), baseUrl: getJiraBaseUrl() });
});

app.get('/api/jira/:key', async (req, res) => {
  if (!isJiraConfigured()) return res.status(501).json({ error: 'Jira integration is not configured' });
  if (!/^[A-Z][A-Z0-9]*-\d+$/i.test(req.params.key)) return res.status(400).json({ error: 'Invalid issue key' });

  try {
    const issue = await fetchIssue(req.params.key);
    if (issue.notFound) return res.status(404).json({ error: 'Issue not found' });
    res.json(issue);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Jira' });
  }
});

app.get('/api/rooms/:id/export', async (req, res) => {
  const hostToken = req.query.token;
  if (!isHostToken(hostToken)) return res.status(403).json({ error: 'Host login required' });
  const room = await getRoom(req.params.id);
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

async function emitRoom(roomId) {
  const room = await getRoom(roomId);
  if (!room) return;
  const entries = entriesForRoom(roomId);
  const connectedIds = new Set(entries.map((e) => e.participantId));
  for (const { socketId, participantId: viewerId } of entries) {
    io.to(socketId).emit('room-state', await toPublicRoom(room, viewerId, connectedIds));
  }
}

io.on('connection', (socket) => {
  let roomId = null;
  let participantId = null;
  let hostSessionToken = null;

  socket.on('join', async ({ roomId: rid, name, participantId: pid, avatarId, isObserver, hostToken }) => {
    const room = await getRoom(rid);
    if (!room) {
      socket.emit('join-error', { error: 'Room not found' });
      return;
    }

    roomId = rid;
    participantId = pid || nanoid(10);
    const host = isHostToken(hostToken);
    if (host) hostSessionToken = hostToken;

    await upsertParticipant(room, {
      participantId,
      name: (name || 'Guest').trim().slice(0, 40) || 'Guest',
      avatarId: Number.isInteger(avatarId) ? avatarId : null,
      isHost: host,
      // Hosts are observers by default; a room can opt in to letting the host vote too.
      isObserver: host ? !room.config.hostCanVote : !!isObserver,
    });
    setPresence(socket.id, roomId, participantId);

    socket.join(roomId);
    socket.emit('joined', { participantId, isHost: host });
    await emitRoom(roomId);
  });

  async function requireHost() {
    const room = await getRoom(roomId);
    if (!room) return null;
    const p = await findParticipant(room, participantId);
    return p?.isHost ? room : null;
  }

  socket.on('vote', async ({ pollType, value }) => {
    const room = await getRoom(roomId);
    if (!room || !participantId) return;
    const participant = await findParticipant(room, participantId);
    if (participant?.isObserver) return;
    if (!room.config.polls[pollType]?.deck.includes(value)) return;
    await vote(room, participantId, pollType, value);
    await emitRoom(roomId);
  });

  socket.on('reveal', async ({ pollType }) => {
    const room = await requireHost();
    if (!room || !room.config.polls[pollType]) return;
    await reveal(room, pollType);
    await emitRoom(roomId);
  });

  socket.on('reset-poll', async ({ pollType }) => {
    const room = await requireHost();
    if (!room || !room.config.polls[pollType]) return;
    await resetPoll(room, pollType);
    await emitRoom(roomId);
  });

  socket.on('reset-item', async () => {
    const room = await requireHost();
    if (!room) return;
    await resetItemVotes(room);
    await emitRoom(roomId);
  });

  socket.on('set-final', async ({ pollType, value }) => {
    const room = await requireHost();
    if (!room || !room.config.polls[pollType]) return;
    await setFinal(room, pollType, value);
    await emitRoom(roomId);

    if (!isJiraConfigured()) return;
    const item = await currentItem(room);
    if (!item) return;

    try {
      await pushFinalValue(item.name, pollType, value);
      io.to(roomId).emit('jira-sync', { itemName: item.name, pollType, ok: true });
    } catch (err) {
      io.to(roomId).emit('jira-sync', { itemName: item.name, pollType, ok: false, error: err.message });
      return;
    }

    if (!ENABLE_JIRA_ATTRIBUTION_COMMENT) return;
    const hostSession = getHostSession(hostSessionToken);
    const participant = await findParticipant(room, participantId);
    const actorLabel = hostSession?.email || participant?.name || 'the host';
    const pollLabel = room.config.polls[pollType].label;

    try {
      await postAttributionComment(item.name, `${pollLabel} set to ${value} by ${actorLabel} via Planning Poker`);
    } catch (err) {
      console.error(`[jira] attribution comment failed for ${item.name}:`, err.message);
    }
  });

  socket.on('add-item', async ({ name }) => {
    const room = await requireHost();
    const trimmed = name?.trim();
    if (!room || !trimmed) return;

    if (room.items.some((i) => i.name.toLowerCase() === trimmed.toLowerCase())) {
      socket.emit('add-item-error', { name: trimmed, error: `${trimmed} is already in this sprint` });
      return;
    }

    if (isJiraConfigured()) {
      try {
        const issue = await fetchIssue(trimmed);
        if (issue.notFound) {
          socket.emit('add-item-error', { name: trimmed, error: `${trimmed} was not found in Jira` });
          return;
        }
      } catch (err) {
        socket.emit('add-item-error', { name: trimmed, error: `Couldn't verify ${trimmed} in Jira: ${err.message}` });
        return;
      }
    }

    await addItem(room, trimmed);
    await emitRoom(roomId);
  });

  socket.on('remove-item', async ({ itemId }) => {
    const room = await requireHost();
    if (!room) return;
    await removeItem(room, itemId);
    await emitRoom(roomId);
  });

  socket.on('set-current-item', async ({ index }) => {
    const room = await requireHost();
    if (!room) return;
    if (index !== room.currentItemIndex && !(await canLeaveCurrentItem(room))) return;
    await setCurrentItemIndex(room, index);
    await emitRoom(roomId);
  });

  socket.on('end-session', async () => {
    const room = await requireHost();
    if (!room) return;
    io.to(roomId).emit('session-ended');
    await deleteRoom(roomId);
  });

  socket.on('disconnect', async () => {
    if (!roomId) return;
    clearPresence(socket.id);
    await emitRoom(roomId);
  });
});

httpServer.listen(PORT, () => {
  console.log(`open-scrum-poker listening on http://localhost:${PORT}`);
});
