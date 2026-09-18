// MongoDB store backend — see docs/DESIGN.md §3 for the schema this implements.
// Selected when ENABLE_IN_MEMORY_STORE=false.
//
// Each mutating call here does a fetch-mutate-replaceOne round trip, reusing the exact
// same mutation logic (roomLogic.js) the in-memory backend uses, so the two backends
// can never drift on business rules. This trades a small amount of write efficiency
// for correctness confidence, since this path can't be exercised against a live
// MongoDB instance in this environment — a future optimization is targeted
// findOneAndUpdate calls with positional operators instead of whole-document replace.
import { MongoClient } from 'mongodb';
import { nanoid } from 'nanoid';
import * as logic from './roomLogic.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'open_scrum_poker';
const ROOM_TTL_SECONDS = Number(process.env.MONGODB_ROOM_TTL_SECONDS) || 60 * 60 * 48; // 48h after a room ends

export const DEFAULT_POLL_CONFIG = logic.DEFAULT_POLL_CONFIG;

let collectionPromise = null;

function getCollection() {
  if (!collectionPromise) {
    const client = new MongoClient(MONGODB_URI);
    collectionPromise = client.connect().then(async (connected) => {
      const rooms = connected.db(MONGODB_DB_NAME).collection('rooms');
      await rooms.createIndex({ id: 1 }, { unique: true });
      // Only TTL-expire rooms once they've been explicitly ended (endedAt set) —
      // active rooms never auto-expire regardless of age.
      await rooms.createIndex(
        { endedAt: 1 },
        { expireAfterSeconds: ROOM_TTL_SECONDS, partialFilterExpression: { endedAt: { $type: 'date' } } }
      );
      return rooms;
    });
  }
  return collectionPromise;
}

function toDomain(doc) {
  if (!doc) return null;
  const { _id, endedAt, ...room } = doc;
  return room;
}

async function save(room) {
  const rooms = await getCollection();
  await rooms.replaceOne({ id: room.id }, { ...room, endedAt: null });
  return room;
}

export async function createRoom(name, config) {
  const rooms = await getCollection();
  const room = {
    id: nanoid(8),
    name: name || 'Sprint Planning',
    createdAt: new Date(),
    config: logic.normalizeConfig(config),
    items: [],
    currentItemIndex: -1,
    participants: [],
  };
  await rooms.insertOne({ ...room, endedAt: null });
  return room;
}

export async function getRoom(id) {
  const rooms = await getCollection();
  const doc = await rooms.findOne({ id, endedAt: null });
  return toDomain(doc);
}

// Soft delete: the document survives (readable for a final export / audit trail) but
// becomes invisible to getRoom/roomExists immediately, and the TTL index reaps it
// automatically after ROOM_TTL_SECONDS.
export async function deleteRoom(id) {
  const rooms = await getCollection();
  const res = await rooms.updateOne({ id, endedAt: null }, { $set: { endedAt: new Date() } });
  return res.matchedCount > 0;
}

export async function roomExists(id) {
  const rooms = await getCollection();
  const count = await rooms.countDocuments({ id, endedAt: null }, { limit: 1 });
  return count > 0;
}

export async function addItem(room, name) {
  const item = logic.addItem(room, name);
  await save(room);
  return item;
}

export async function removeItem(room, itemId) {
  logic.removeItem(room, itemId);
  await save(room);
}

export async function currentItem(room) {
  return logic.currentItem(room);
}

export async function setCurrentItemIndex(room, index) {
  const ok = logic.setCurrentItemIndex(room, index);
  if (ok) await save(room);
  return ok;
}

export async function canLeaveCurrentItem(room) {
  return logic.canLeaveCurrentItem(room);
}

export async function vote(room, participantId, pollType, value) {
  const ok = logic.vote(room, participantId, pollType, value);
  if (ok) await save(room);
  return ok;
}

export async function reveal(room, pollType) {
  logic.reveal(room, pollType);
  await save(room);
}

export async function resetPoll(room, pollType) {
  logic.resetPoll(room, pollType);
  await save(room);
}

export async function resetItemVotes(room) {
  logic.resetItemVotes(room);
  await save(room);
}

export async function setFinal(room, pollType, value) {
  logic.setFinal(room, pollType, value);
  await save(room);
}

export async function upsertParticipant(room, participant) {
  logic.upsertParticipant(room, participant);
  await save(room);
}

export async function findParticipant(room, participantId) {
  return logic.findParticipant(room, participantId);
}

export async function toPublicRoom(room, viewerParticipantId, connectedParticipantIds) {
  return logic.toPublicRoom(room, viewerParticipantId, connectedParticipantIds);
}
