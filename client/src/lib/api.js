// The server (or a proxy in front of it) doesn't always fail with a JSON body —
// a crashed/unreachable backend can return an HTML error page instead, which makes
// res.json() throw "Unexpected token '<' ... is not valid JSON". Fall back to a
// generic message in that case instead of surfacing the parse error to the user.
async function readErrorMessage(res, fallback) {
  try {
    const data = await res.json();
    return data?.error || fallback;
  } catch {
    return fallback;
  }
}

export async function getAtlassianLoginConfig() {
  const res = await fetch('/api/auth/atlassian/config');
  if (!res.ok) return { enabled: false };
  return res.json();
}

export async function hostLogin(password) {
  const res = await fetch('/api/host-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Login failed'));
  return res.json();
}

export async function checkHostSession(hostToken) {
  const res = await fetch('/api/host-session', { headers: { 'x-host-token': hostToken } });
  if (!res.ok) return false;
  return (await res.json()).valid;
}

export async function createRoom(hostToken, name, config) {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-host-token': hostToken },
    body: JSON.stringify({ name, config }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Could not create room'));
  return res.json();
}

export async function roomExists(roomId) {
  const res = await fetch(`/api/rooms/${roomId}`);
  return res.ok;
}

export function exportUrl(roomId, hostToken) {
  return `/api/rooms/${roomId}/export?token=${encodeURIComponent(hostToken)}`;
}
