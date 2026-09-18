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
  if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
  return res.json();
}

export async function createRoom(hostToken, name, config) {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-host-token': hostToken },
    body: JSON.stringify({ name, config }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Could not create room');
  return res.json();
}

export async function roomExists(roomId) {
  const res = await fetch(`/api/rooms/${roomId}`);
  return res.ok;
}

export function exportUrl(roomId, hostToken) {
  return `/api/rooms/${roomId}/export?token=${encodeURIComponent(hostToken)}`;
}
