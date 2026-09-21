// In-memory store backend. Everything lives in a Map only — restarting the process
// clears all rooms. Selected when ENABLE_IN_MEMORY_STORE is unset or "true".
import { nanoid } from 'nanoid';
import * as logic from './roomLogic.js';

const rooms = new Map();

export const DEFAULT_POLL_CONFIG = logic.DEFAULT_POLL_CONFIG;

export async function createRoom(name, config) {
  const room = {
    id: nanoid(8),
    name: name || 'Sprint Planning',
    createdAt: Date.now(),
    config: logic.normalizeConfig(config),
    items: [],
    currentItemIndex: -1,
    participants: [], // durable roster only — see roomLogic.js
  };
  rooms.set(room.id, room);
  return room;
}

export async function getRoom(id) {
  return rooms.get(id) || null;
}

export async function deleteRoom(id) {
  return rooms.delete(id);
}

export async function roomExists(id) {
  return rooms.has(id);
}

// The room object handed back by getRoom() IS the object stored in the Map, so every
// mutation below persists simply by being applied in place — no separate "save" step.
export async function addItem(room, name) {
  return logic.addItem(room, name);
}

export async function removeItem(room, itemId) {
  logic.removeItem(room, itemId);
}

export async function currentItem(room) {
  return logic.currentItem(room);
}

export async function setCurrentItemIndex(room, index) {
  return logic.setCurrentItemIndex(room, index);
}

export async function canLeaveCurrentItem(room) {
  return logic.canLeaveCurrentItem(room);
}

export async function vote(room, participantId, pollType, value) {
  return logic.vote(room, participantId, pollType, value);
}

export async function reveal(room, pollType) {
  logic.reveal(room, pollType);
}

export async function resetPoll(room, pollType) {
  logic.resetPoll(room, pollType);
}

export async function resetItemVotes(room) {
  logic.resetItemVotes(room);
}

export async function setFinal(room, pollType, value) {
  logic.setFinal(room, pollType, value);
}

export async function upsertParticipant(room, participant) {
  logic.upsertParticipant(room, participant);
}

export async function updateConfig(room, config) {
  logic.updateConfig(room, config);
}

export async function findParticipant(room, participantId) {
  return logic.findParticipant(room, participantId);
}

export async function toPublicRoom(room, viewerParticipantId, connectedParticipantIds) {
  return logic.toPublicRoom(room, viewerParticipantId, connectedParticipantIds);
}
