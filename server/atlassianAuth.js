import { randomUUID } from 'node:crypto';

// "Login with Atlassian" — OAuth 2.0 (3LO), identity-only (Option A from the design
// discussion in docs/DESIGN.md-adjacent chat history: this only decides *who's allowed
// to be host*; it is not used to make Jira API calls — server/jira.js is unaffected and
// keeps using its own service-account credentials for issue lookups and writes).
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

// One-time-use CSRF state tokens for the authorize -> callback round trip.
// In-memory only: losing these on restart just means an in-flight login has to restart,
// same tradeoff as everything else in the in-memory store backend.
const STATE_TTL_MS = 5 * 60 * 1000;
const pendingStates = new Map(); // state -> expiresAt

function sweepExpiredStates() {
  const now = Date.now();
  for (const [state, expiresAt] of pendingStates) {
    if (expiresAt <= now) pendingStates.delete(state);
  }
}

export function createState() {
  sweepExpiredStates();
  const state = randomUUID();
  pendingStates.set(state, Date.now() + STATE_TTL_MS);
  return state;
}

export function consumeState(state) {
  if (!state || !pendingStates.has(state)) return false;
  const expiresAt = pendingStates.get(state);
  pendingStates.delete(state);
  return expiresAt > Date.now();
}

export function buildAuthorizeUrl(state) {
  assertConfigured();
  const params = new URLSearchParams({
    audience: 'api.atlassian.com',
    client_id: CLIENT_ID,
    scope: 'read:me',
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    state,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForAccessToken(code) {
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
  const data = await res.json();
  return data.access_token;
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
