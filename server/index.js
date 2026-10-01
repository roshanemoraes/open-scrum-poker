import path from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';

import {
  attemptHostLogin,
  issueHostToken,
  isHostToken,
  getHostSession,
  hostHasJiraWriteAccess,
  getHostJiraAccessToken,
} from './auth.js';
import {
  isAtlassianLoginEnabled,
  createState,
  consumeState,
  buildAuthorizeUrl,
  exchangeCodeForTokens,
  fetchAtlassianIdentity,
  isAuthorizedIdentity,
} from './atlassianAuth.js';
import {
  createRoom,
  getRoom,
  deleteRoom,
  roomExists,
  addItem,
  importItems,
  addJiraItems,
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
  updateConfig,
} from './store.js';
import { setPresence, clearPresence, entriesForRoom } from './presence.js';

import { buildWorkbook } from './exportXlsx.js';
import { fetchIssue, isJiraConfigured, pushFinalValue, postAttributionComment, getJiraBaseUrl, searchJql } from './jira.js';

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

app.get('/api/host-session', (req, res) => {
  const hostToken = req.header('x-host-token');
  res.json({ valid: isHostToken(hostToken) });
});

app.get('/api/auth/atlassian/config', (req, res) => {
  res.json({ enabled: isAtlassianLoginEnabled() });
});

app.get('/api/auth/atlassian/login', (req, res) => {
  if (!isAtlassianLoginEnabled()) return res.status(404).end();
  try {
    const wantsWrite = req.query.write === '1';
    const state = createState(wantsWrite);
    res.redirect(buildAuthorizeUrl(state, wantsWrite));
  } catch (err) {
    res.status(500).send('Atlassian login is not configured correctly on the server.');
  }
});

app.get('/api/auth/atlassian/callback', async (req, res) => {
  if (!isAtlassianLoginEnabled()) return res.status(404).end();
  const { code, state } = req.query;

  const consumed = consumeState(state);
  if (!consumed) {
    return res.redirect('/?atlassianError=invalid_state');
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const identity = await fetchAtlassianIdentity(tokens.accessToken);

    if (!isAuthorizedIdentity(identity)) {
      return res.redirect('/?atlassianError=unauthorized');
    }

    const token = issueHostToken({
      method: 'atlassian',
      email: identity.email,
      name: identity.name,
      accountId: identity.account_id,
      jira: tokens,
      jiraWriteEnabled: consumed.wantsWrite,
    });
    const params = new URLSearchParams({ hostToken: token });
    if (identity.name) params.set('hostName', identity.name);
    if (identity.email) params.set('hostEmail', identity.email);
    res.redirect(`/?${params.toString()}`);
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

// Resolves what Authorization header a Jira read call should use for this host.
// When Atlassian login is on, every host's own token already has read:jira-work
// (see atlassianAuth.js) — reads never touch the shared service-account token in that
// mode. When it's off (password-login hosts), `authorization: undefined` makes
// jira.js's read calls fall back to their default (the shared token).
async function resolveJiraReadAuth(hostToken) {
  if (!isAtlassianLoginEnabled()) return { authorization: undefined };
  const accessToken = await getHostJiraAccessToken(hostToken);
  if (!accessToken) return { error: 'Your Atlassian session expired — log in again to use Jira.' };
  return { authorization: `Bearer ${accessToken}` };
}

// Host-gated (not just isJiraConfigured) — arbitrary JQL is a much broader read
// surface than fetching one already-known issue, and (when Atlassian login is on)
// this is a per-host token, so it has to be the host making the call anyway.
app.post('/api/jira/search', async (req, res) => {
  const hostToken = req.header('x-host-token');
  if (!isHostToken(hostToken)) return res.status(403).json({ error: 'Host login required' });
  if (!isJiraConfigured()) return res.status(501).json({ error: 'Jira integration is not configured' });
  const jql = (req.body?.jql || '').trim();
  if (!jql) return res.status(400).json({ error: 'JQL query is required' });

  const auth = await resolveJiraReadAuth(hostToken);
  if (auth.error) return res.status(401).json({ error: auth.error });

  try {
    const items = await searchJql(jql, 100, auth.authorization);
    res.json({ items });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// There is no longer a per-key issue-fetch endpoint — guests never call Jira
// directly (read or write). Every item's Jira data is fetched once by the host at
// add-time and persisted on the item itself (item.imported); ItemHeader/JiraDrawer
// read from room-state only.

app.get('/api/rooms/:id/export', async (req, res) => {
  const hostToken = req.query.token;
  if (!isHostToken(hostToken)) return res.status(403).json({ error: 'Host login required' });
  const room = await getRoom(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const buffer = await buildWorkbook(room);
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

  socket.on('set-observer', async ({ isObserver: nextObserver }) => {
    const room = await getRoom(roomId);
    if (!room || !participantId) return;
    await upsertParticipant(room, { participantId, isObserver: !!nextObserver });
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

  socket.on('update-config', async ({ config }) => {
    const room = await requireHost();
    if (!room) return;
    await updateConfig(room, config);
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

    // Clearing the final (host clicked "Change") isn't a value to sync — Number(null)
    // is 0, so without this guard we'd push a bogus 0 to the linked Jira field.
    if (value == null) return;
    if (!isJiraConfigured()) return;
    const item = await currentItem(room);
    if (!item) return;

    // Atlassian login on: write as the host using their own OAuth token — unless this
    // session deliberately only requested read access, in which case skip the sync
    // rather than attempt a write with a token that was never granted write:jira-work.
    // Atlassian login off (or a password-login host): writeAuth stays undefined and
    // jira.js falls back to the shared token.
    let writeAuth;
    if (isAtlassianLoginEnabled()) {
      if (!hostHasJiraWriteAccess(hostSessionToken)) {
        io.to(roomId).emit('jira-sync', {
          itemName: item.name,
          pollType,
          skipped: true,
          message: 'Not synced to Jira — this session has read-only access.',
        });
        return;
      }
      const accessToken = await getHostJiraAccessToken(hostSessionToken);
      if (!accessToken) {
        io.to(roomId).emit('jira-sync', {
          itemName: item.name,
          pollType,
          ok: false,
          error: 'Your Atlassian session expired — log in again to sync to Jira',
        });
        return;
      }
      writeAuth = `Bearer ${accessToken}`;
    }

    try {
      await pushFinalValue(item.name, pollType, value, writeAuth);
      io.to(roomId).emit('jira-sync', { itemName: item.name, pollType, ok: true });
    } catch (err) {
      io.to(roomId).emit('jira-sync', { itemName: item.name, pollType, ok: false, error: err.message });
      return;
    }

    // With the host's own token Jira's changelog already names them, so the comment is
    // only useful when the write went through the shared account.
    if (writeAuth || !ENABLE_JIRA_ATTRIBUTION_COMMENT) return;
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

    // Fetched once, here, and persisted on the item (item.imported) — never fetched
    // again. Guests (and the host, after this point) only ever read it from room-state.
    let imported;
    if (isJiraConfigured()) {
      const auth = await resolveJiraReadAuth(hostSessionToken);
      if (auth.error) {
        socket.emit('add-item-error', { name: trimmed, error: auth.error });
        return;
      }
      try {
        const issue = await fetchIssue(trimmed, auth.authorization);
        if (issue.notFound) {
          socket.emit('add-item-error', { name: trimmed, error: `${trimmed} was not found in Jira` });
          return;
        }
        imported = { title: issue.summary, assignee: issue.assignee, description: issue.description, comments: issue.comments, url: issue.url };
      } catch (err) {
        socket.emit('add-item-error', { name: trimmed, error: `Couldn't verify ${trimmed} in Jira: ${err.message}` });
        return;
      }
    }

    await addItem(room, trimmed, imported ? { source: 'jira', imported } : undefined);
    await emitRoom(roomId);
  });

  // Bulk-add items from a parsed CSV (client parses the file; this just persists the
  // rows). No Jira verification here by design — the whole point of importing is to
  // work when Jira isn't connected, and even when it is, imported items are trusted
  // as-is rather than round-tripped through a live lookup per row.
  socket.on('import-items', async ({ items }) => {
    const room = await requireHost();
    if (!room || !Array.isArray(items) || items.length === 0) return;

    const result = await importItems(room, items);
    socket.emit('import-items-result', result);
    await emitRoom(roomId);
  });

  // Bulk-add from the JQL results picker. The client sends back the full result
  // objects it already has from /api/jira/search (which now fetches full detail, not
  // just preview fields) — no per-item re-fetch here, same "fetched once, persisted"
  // rule as single add-item.
  socket.on('add-jira-items', async ({ items }) => {
    const room = await requireHost();
    if (!room || !Array.isArray(items) || items.length === 0) return;

    const result = await addJiraItems(room, items);
    socket.emit('add-jira-items-result', result);
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
