import { nanoid } from 'nanoid';

const HOST_PASSWORD = process.env.HOST_PASSWORD;
const hostTokens = new Set();

export function attemptHostLogin(password) {
  if (password !== HOST_PASSWORD) return null;
  const token = nanoid(24);
  hostTokens.add(token);
  return token;
}

export function isHostToken(token) {
  return !!token && hostTokens.has(token);
}
