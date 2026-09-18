// Presence — which sockets are live right now, in which room, as which participant.
// Deliberately never persisted to any store backend (in-memory or MongoDB): a
// WebSocket connection is only ever meaningful to *this* server process, *right now*.
// See docs/DESIGN.md §3.2/§3.4.
const bySocket = new Map(); // socketId -> { roomId, participantId }

export function setPresence(socketId, roomId, participantId) {
  bySocket.set(socketId, { roomId, participantId });
}

export function clearPresence(socketId) {
  bySocket.delete(socketId);
}

// All live { socketId, participantId } pairs currently connected to a room.
export function entriesForRoom(roomId) {
  const result = [];
  for (const [socketId, entry] of bySocket) {
    if (entry.roomId === roomId) result.push({ socketId, participantId: entry.participantId });
  }
  return result;
}
