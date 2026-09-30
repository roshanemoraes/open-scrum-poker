import { nanoid } from 'nanoid';
import { refreshAccessToken } from './atlassianAuth.js';

const HOST_PASSWORD = process.env.HOST_PASSWORD;

// token -> { method: 'password' | 'atlassian', email?, name?, accountId?,
//            jira?: { accessToken, refreshToken, expiresAt }, jiraWriteEnabled?, createdAt }
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

// True only when this host explicitly requested (and was granted) write:jira-work at
// login — set once at issueHostToken time. Lets callers skip a Jira write attempt
// entirely for a by-design read-only session, instead of treating the missing token
// as an expired one.
export function hostHasJiraWriteAccess(token) {
  return !!getHostSession(token)?.jiraWriteEnabled;
}

// Access token for writing to Jira as this host, or null if the session has none (e.g.
// a password login, or an Atlassian login that didn't request write access) or the
// refresh failed. Concurrent callers share one in-flight refresh, since Atlassian's
// rotating refresh tokens can only be redeemed once.
export async function getJiraWriteAccessToken(token) {
  const session = getHostSession(token);
  const jira = session?.jira;
  if (!jira?.accessToken) return null;
  if (jira.expiresAt - Date.now() > 60_000) return jira.accessToken;
  if (!jira.refreshToken) return null;

  if (!session.refreshing) {
    session.refreshing = refreshAccessToken(jira.refreshToken)
      .then((tokens) => {
        session.jira = { ...jira, ...tokens };
      })
      .catch(() => {
        session.jira = null;
      })
      .finally(() => {
        session.refreshing = null;
      });
  }
  await session.refreshing;
  return session.jira?.accessToken || null;
}

export function revokeHostToken(token) {
  return hostTokens.delete(token);
}
