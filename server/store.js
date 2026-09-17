// Store backend facade. Set ENABLE_IN_MEMORY_STORE=false in .env to switch to the
// MongoDB-backed implementation (see docs/DESIGN.md §3 for the schema). Defaults to
// the in-memory backend if unset, so existing setups keep working unchanged.
const useInMemory = (process.env.ENABLE_IN_MEMORY_STORE ?? 'true').trim().toLowerCase() !== 'false';

const impl = useInMemory ? await import('./store.memory.js') : await import('./store.mongo.js');

console.log(`[store] Using ${useInMemory ? 'in-memory' : 'MongoDB'} store backend`);

export const {
  DEFAULT_POLL_CONFIG,
  createRoom,
  getRoom,
  deleteRoom,
  roomExists,
  addItem,
  removeItem,
  currentItem,
  setCurrentItemIndex,
  canLeaveCurrentItem,
  vote,
  reveal,
  resetPoll,
  resetItemVotes,
  setFinal,
  upsertParticipant,
  findParticipant,
  toPublicRoom,
} = impl;
