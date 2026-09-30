import { randomUUID } from 'node:crypto';

// "Login with Atlassian" — OAuth 2.0 (3LO). Always decides *who's allowed to be host*.
// The login screen also offers a "request Jira write access" toggle (off by default —
// read:me only); when on, this also requests write:jira-work + offline_access, and the
// host's own token is what server/jira.js uses to write final values back to Jira as
// them. Reads (issue lookups) always use the shared JIRA_EMAIL/JIRA_API_TOKEN account
// regardless of this toggle.
//
// Gated entirely behind ENABLE_ATLASSIAN_LOGIN — when unset/false, none of this runs and
// the existing HOST_PASSWORD flow (server/auth.js) behaves exactly as before.

const AUTHORIZE_URL = 'https://auth.atlassian.com/authorize';
const TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
const IDENTITY_URL = 'https://api.atlassian.com/me';

const CLIENT_ID = process.env.ATLASSIAN_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.ATLASSIAN_OAUTH_CLIENT_SECRET;
const REDIRECT_URI = process.env.ATLASSIAN_OAUTH_REDIRECT_URI;

// Comma-separated list of allowed email domains, e.g. "company.com,partner.com".
// Left unset = any Atlassian account with a *verified* email is accepted. Strongly
// recommended to set this once ENABLE_ATLASSIAN_LOGIN is turned on for real.
const ALLOWED_DOMAINS = (process.env.ATLASSIAN_ALLOWED_EMAIL_DOMAINS || '')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

export function isAtlassianLoginEnabled() {
  return (process.env.ENABLE_ATLASSIAN_LOGIN || '').trim().toLowerCase() === 'true';
}

function assertConfigured() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    throw new Error(
      'ENABLE_ATLASSIAN_LOGIN is true but ATLASSIAN_OAUTH_CLIENT_ID / ATLASSIAN_OAUTH_CLIENT_SECRET / ATLASSIAN_OAUTH_REDIRECT_URI are not all set'
    );
  }
}

// One-time-use CSRF state tokens for the authorize -> callback round trip. Also carries
// the write-access choice the host made on the login screen, so the callback (which
// only gets `state` back from Atlassian) knows whether write:jira-work was requested.
// In-memory only: losing these on restart just means an in-flight login has to restart,
// same tradeoff as everything else in the in-memory store backend.
const STATE_TTL_MS = 5 * 60 * 1000;
const pendingStates = new Map(); // state -> { expiresAt, wantsWrite }

function sweepExpiredStates() {
  const now = Date.now();
  for (const [state, { expiresAt }] of pendingStates) {
    if (expiresAt <= now) pendingStates.delete(state);
  }
}

export function createState(wantsWrite) {
  sweepExpiredStates();
  const state = randomUUID();
  pendingStates.set(state, { expiresAt: Date.now() + STATE_TTL_MS, wantsWrite: !!wantsWrite });
  return state;
}

// Returns { wantsWrite } if `state` was live and unused, otherwise null.
export function consumeState(state) {
  const entry = state ? pendingStates.get(state) : null;
  if (!entry) return null;
  pendingStates.delete(state);
  if (entry.expiresAt <= Date.now()) return null;
  return { wantsWrite: entry.wantsWrite };
}

export function buildAuthorizeUrl(state, wantsWrite) {
  assertConfigured();
  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: CLIENT_ID,
    // write:jira-work lets the host's own token write final values back to Jira;
    // offline_access yields a refresh token so that keeps working past the ~1h access token.
    // Read-only hosts (the default) only get read:me — Jira final-value syncs for them
    // are skipped rather than attempted with a token that can't write.
    scope: wantsWrite ? 'read:me write:jira-work offline_access' : 'read:me',
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    prompt: 'consent',
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

function toTokenSet(data) {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };
}

// Atlassian rotates refresh tokens: every refresh returns a new one and invalidates the old.
export async function refreshAccessToken(refreshToken) {
  assertConfigured();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Atlassian token refresh failed (${res.status})`);
  return toTokenSet(await res.json());
}

// Returns { accessToken, refreshToken, expiresAt }.
export async function exchangeCodeForTokens(code) {
  assertConfigured();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
  if (!res.ok) throw new Error(`Atlassian token exchange failed (${res.status})`);
  return toTokenSet(await res.json());
}

export async function fetchAtlassianIdentity(accessToken) {
  const res = await fetch(IDENTITY_URL, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Atlassian identity lookup failed (${res.status})`);
  return res.json(); // { account_id, email, email_verified, name, picture, ... }
}

// The authorization decision that replaces "knows the shared password".
export function isAuthorizedIdentity(identity) {
  if (!identity?.email || !identity.email_verified) return false;
  if (ALLOWED_DOMAINS.length === 0) return true;
  const domain = identity.email.split('@')[1]?.toLowerCase();
  return ALLOWED_DOMAINS.includes(domain);
}
