import { nanoid } from 'nanoid';

const HOST_PASSWORD = process.env.HOST_PASSWORD;

// token -> { method: 'password' | 'atlassian', email?, name?, accountId?, createdAt }
const hostTokens = new Map();

export function issueHostToken(meta = {}) {
  const token = nanoid(24);
  hostTokens.set(token, { ...meta, createdAt: Date.now() });
  return token;
}

export function attemptHostLogin(password) {
  if (password !== HOST_PASSWORD) return null;
  return issueHostToken({ method: 'password' });
}

export function isHostToken(token) {
  return !!token && hostTokens.has(token);
}

export function getHostSession(token) {
  return hostTokens.get(token) || null;
}

export function revokeHostToken(token) {
  return hostTokens.delete(token);
}
