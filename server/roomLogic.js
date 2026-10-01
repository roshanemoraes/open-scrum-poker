// Pure room-mutation logic shared by every store backend (in-memory or MongoDB).
// Nothing here does I/O — a backend calls these against a plain JS room object it
// already has in hand, then persists the result however it needs to.
import { nanoid } from 'nanoid';

export const DEFAULT_POLL_CONFIG = {
  rci: { enabled: true, label: 'Requirement Clarity Index', deck: ['1', '2', '3', '4', '5', '?'] },
  effort: { enabled: true, label: 'Effort', deck: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?'] },
};

export function normalizeConfig(config) {
  const source = config?.polls || DEFAULT_POLL_CONFIG;
  const polls = {};

  for (const [type, poll] of Object.entries(source)) {
    if (!poll?.enabled) continue;
    const deck = Array.isArray(poll.deck) && poll.deck.length > 0 ? poll.deck : DEFAULT_POLL_CONFIG[type]?.deck;
    if (!deck) continue;
    polls[type] = { enabled: true, label: poll.label || type, deck };
  }

  // At least one voting table must exist; fall back to the defaults rather than leaving a room unusable.
  const resolvedPolls = Object.keys(polls).length > 0 ? polls : DEFAULT_POLL_CONFIG;

  return {
    itemPrefix: typeof config?.itemPrefix === 'string' ? config.itemPrefix.trim() : '',
    hostCanVote: !!config?.hostCanVote,
    polls: resolvedPolls,
  };
}

export function updateConfig(room, config) {
  room.config = normalizeConfig(config);
}

export function enabledPollTypes(room) {
  return Object.keys(room.config.polls);
}

// opts.source: 'jira' (default — a real Jira issue, added via the single add-item
// flow or the JQL bulk-add) or 'import' (bulk-loaded from a CSV export). Both now
// carry a one-time snapshot in opts.imported — fetched once by the server at add
// time and never re-fetched — but in two different shapes, since they come from two
// different data sources:
//   'jira'   -> { title, assignee, description (ADF), comments (ADF bodies), url }
//   'import' -> { title, assignee, acceptanceCriteria (wiki markup), comments (plain text) }
// Nothing — host or guest — fetches live from Jira after an item is added; the client
// picks its renderer (AdfContent vs WikiMarkupContent) based on which shape is present.
export function makeItem(room, name, opts = {}) {
  const source = opts.source === 'import' ? 'import' : 'jira';
  const item = { id: nanoid(8), name, source };
  const imported = opts.imported;
  if (source === 'import' && imported) {
    item.imported = {
      title: imported.title || '',
      assignee: imported.assignee || '',
      acceptanceCriteria: imported.acceptanceCriteria || '',
      comments: Array.isArray(imported.comments) ? imported.comments : [],
    };
  } else if (source === 'jira' && imported) {
    item.imported = {
      title: imported.title || '',
      assignee: imported.assignee || '',
      description: imported.description || null,
      comments: Array.isArray(imported.comments) ? imported.comments : [],
      url: imported.url || null,
    };
  }
  for (const type of enabledPollTypes(room)) {
    item[type] = { votes: {}, revealed: false, final: null };
  }
  return item;
}

export function addItem(room, name, opts) {
  const item = makeItem(room, name, opts);
  room.items.push(item);
  if (room.currentItemIndex === -1) room.currentItemIndex = 0;
  return item;
}

// Bulk-adds imported rows, skipping any whose name already exists in the room
// (case-insensitive) — same duplicate rule the single-item add flow uses.
export function importItems(room, rows) {
  const existingNames = new Set(room.items.map((i) => i.name.toLowerCase()));
  const added = [];
  const skipped = [];

  for (const row of rows || []) {
    const name = row?.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (existingNames.has(key)) {
      skipped.push(name);
      continue;
    }
    existingNames.add(key);
    addItem(room, name, { source: 'import', imported: row });
    added.push(name);
  }

  return { added, skipped };
}

// Bulk-adds items picked from a JQL search — each row is the full result object
// /api/jira/search already returned (key, title, assignee, description, comments,
// url), so this persists it as a source:'jira' snapshot with no further fetch, same
// as a manually added item. Same duplicate rule as the other add paths.
export function addJiraItems(room, rows) {
  const existingNames = new Set(room.items.map((i) => i.name.toLowerCase()));
  const added = [];
  const skipped = [];

  for (const row of rows || []) {
    const name = (row?.key || row?.name)?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (existingNames.has(key)) {
      skipped.push(name);
      continue;
    }
    existingNames.add(key);
    addItem(room, name, {
      source: 'jira',
      imported: { title: row.summary, assignee: row.assignee, description: row.description, comments: row.comments, url: row.url },
    });
    added.push(name);
  }

  return { added, skipped };
}

export function removeItem(room, itemId) {
  const idx = room.items.findIndex((i) => i.id === itemId);
  if (idx === -1) return;
  room.items.splice(idx, 1);
  if (room.currentItemIndex >= room.items.length) {
    room.currentItemIndex = room.items.length - 1;
  }
}

export function currentItem(room) {
  if (room.currentItemIndex < 0 || room.currentItemIndex >= room.items.length) return null;
  return room.items[room.currentItemIndex];
}

export function setCurrentItemIndex(room, index) {
  if (index < 0 || index >= room.items.length) return false;
  room.currentItemIndex = index;
  return true;
}

// Host must confirm final values for every enabled poll before leaving the item they're on.
export function canLeaveCurrentItem(room) {
  const item = currentItem(room);
  if (!item) return true;
  return enabledPollTypes(room).every((type) => item[type]?.final != null);
}

export function vote(room, participantId, pollType, value) {
  const item = currentItem(room);
  if (!item) return false;
  const poll = item[pollType];
  if (!poll || poll.revealed) return false;
  poll.votes[participantId] = value;
  return true;
}

export function reveal(room, pollType) {
  const item = currentItem(room);
  if (!item?.[pollType]) return;
  item[pollType].revealed = true;
}

export function resetPoll(room, pollType) {
  const item = currentItem(room);
  if (!item?.[pollType]) return;
  item[pollType].votes = {};
  item[pollType].revealed = false;
  item[pollType].final = null;
}

export function resetItemVotes(room) {
  const item = currentItem(room);
  if (!item) return;
  for (const type of enabledPollTypes(room)) {
    item[type].votes = {};
    item[type].revealed = false;
    item[type].final = null;
  }
}

export function setFinal(room, pollType, value) {
  const item = currentItem(room);
  if (!item?.[pollType]) return;
  item[pollType].final = value;
}

// Participants are a durable roster keyed by the app's own stable participantId —
// NOT by socket id, and with no "connected" flag. Live-connection state is presence
// (server/presence.js), which is never persisted. See docs/DESIGN.md §3.2/§3.4.
export function upsertParticipant(room, participant) {
  const idx = room.participants.findIndex((p) => p.participantId === participant.participantId);
  if (idx === -1) room.participants.push(participant);
  else room.participants[idx] = { ...room.participants[idx], ...participant };
}

export function findParticipant(room, participantId) {
  return room.participants.find((p) => p.participantId === participantId);
}

// connectedParticipantIds: a Set of participantIds currently online, supplied by the
// caller (sourced from presence.js) — this is the one place durable roster and live
// connections merge back together, and only for the duration of building this DTO.
export function toPublicRoom(room, viewerParticipantId, connectedParticipantIds) {
  const item = currentItem(room);

  const scrub = (poll) => {
    if (!poll) return null;
    const votedIds = Object.keys(poll.votes);
    return {
      revealed: poll.revealed,
      final: poll.final,
      votedCount: votedIds.length,
      votedIds,
      votes: poll.revealed ? poll.votes : undefined,
      myVote: viewerParticipantId ? poll.votes[viewerParticipantId] ?? null : null,
    };
  };

  const currentItemPolls = {};
  if (item) {
    for (const type of enabledPollTypes(room)) {
      currentItemPolls[type] = scrub(item[type]);
    }
  }

  const participants = room.participants
    .filter((p) => connectedParticipantIds.has(p.participantId))
    .map((p) => ({
      id: p.participantId,
      name: p.name,
      avatarId: p.avatarId,
      isHost: p.isHost,
      isObserver: p.isObserver,
    }));

  return {
    id: room.id,
    name: room.name,
    config: room.config,
    items: room.items.map((i) => ({ id: i.id, name: i.name, source: i.source || 'jira' })),
    currentItemIndex: room.currentItemIndex,
    currentItem: item
      ? { id: item.id, name: item.name, source: item.source || 'jira', imported: item.imported || null, ...currentItemPolls }
      : null,
    participants,
  };
}
