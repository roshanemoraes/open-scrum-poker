import { nanoid } from 'nanoid';

// Everything lives in memory only. Restarting the process clears all rooms.
const rooms = new Map();

export const DEFAULT_POLL_CONFIG = {
  rci: { enabled: true, label: 'Requirement Clarity Index', deck: ['1', '2', '3', '4', '5', '?'] },
  effort: { enabled: true, label: 'Effort', deck: ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?'] },
};

function normalizeConfig(config) {
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

function enabledPollTypes(room) {
  return Object.keys(room.config.polls);
}

function makeItem(room, name) {
  const item = { id: nanoid(8), name };
  for (const type of enabledPollTypes(room)) {
    item[type] = { votes: {}, revealed: false, final: null };
  }
  return item;
}

export function createRoom(name, config) {
  const id = nanoid(8);
  const room = {
    id,
    name: name || 'Sprint Planning',
    createdAt: Date.now(),
    config: normalizeConfig(config),
    items: [],
    currentItemIndex: -1,
    participants: {}, // socketId -> { id, name, avatarId, isHost, isObserver, connected }
  };
  rooms.set(id, room);
  return room;
}

export function getRoom(id) {
  return rooms.get(id);
}

export function deleteRoom(id) {
  return rooms.delete(id);
}

export function roomExists(id) {
  return rooms.has(id);
}

export function addItem(room, name) {
  const item = makeItem(room, name);
  room.items.push(item);
  if (room.currentItemIndex === -1) room.currentItemIndex = 0;
  return item;
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

export function publicParticipants(room) {
  return Object.values(room.participants).filter((p) => p.connected);
}

export function toPublicRoom(room, participantId) {
  const item = currentItem(room);
  const participants = publicParticipants(room);

  const scrub = (poll) => {
    if (!poll) return null;
    const votedIds = Object.keys(poll.votes);
    return {
      revealed: poll.revealed,
      final: poll.final,
      votedCount: votedIds.length,
      votedIds,
      votes: poll.revealed ? poll.votes : undefined,
      myVote: participantId ? poll.votes[participantId] ?? null : null,
    };
  };

  const currentItemPolls = {};
  if (item) {
    for (const type of enabledPollTypes(room)) {
      currentItemPolls[type] = scrub(item[type]);
    }
  }

  return {
    id: room.id,
    name: room.name,
    config: room.config,
    items: room.items.map((i) => ({ id: i.id, name: i.name })),
    currentItemIndex: room.currentItemIndex,
    currentItem: item ? { id: item.id, name: item.name, ...currentItemPolls } : null,
    participants,
  };
}
