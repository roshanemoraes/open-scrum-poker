import { nanoid } from 'nanoid';

// Everything lives in memory only. Restarting the process clears all rooms.
const rooms = new Map();

export const EFFORT_DECK = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?'];
export const RCI_DECK = ['1', '2', '3', '4', '5', '?'];

function makeItem(name) {
  return {
    id: nanoid(8),
    name,
    rci: { votes: {}, revealed: false, final: null },
    effort: { votes: {}, revealed: false, final: null },
  };
}

export function createRoom(name) {
  const id = nanoid(8);
  const room = {
    id,
    name: name || 'Sprint Planning',
    createdAt: Date.now(),
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
  const item = makeItem(name);
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
  if (!item) return;
  item[pollType].revealed = true;
}

export function resetPoll(room, pollType) {
  const item = currentItem(room);
  if (!item) return;
  item[pollType].votes = {};
  item[pollType].revealed = false;
  item[pollType].final = null;
}

export function resetItemVotes(room) {
  const item = currentItem(room);
  if (!item) return;
  item.rci.votes = {};
  item.rci.revealed = false;
  item.rci.final = null;
  item.effort.votes = {};
  item.effort.revealed = false;
  item.effort.final = null;
}

export function setFinal(room, pollType, value) {
  const item = currentItem(room);
  if (!item) return;
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

  return {
    id: room.id,
    name: room.name,
    items: room.items.map((i) => ({ id: i.id, name: i.name })),
    currentItemIndex: room.currentItemIndex,
    currentItem: item
      ? {
          id: item.id,
          name: item.name,
          rci: scrub(item.rci),
          effort: scrub(item.effort),
        }
      : null,
    participants,
  };
}
