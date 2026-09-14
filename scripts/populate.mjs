import 'dotenv/config';
import { io } from 'socket.io-client';

const args = process.argv.slice(2);
const count = Number(args.find((a) => /^\d+$/.test(a))) || 15;
const urlFlagIndex = args.indexOf('--url');
const BASE = urlFlagIndex !== -1 ? args[urlFlagIndex + 1] : `http://localhost:${process.env.PORT || 3001}`;
const passwordFlagIndex = args.indexOf('--password');
const PASSWORD = passwordFlagIndex !== -1 ? args[passwordFlagIndex + 1] : (process.env.HOST_PASSWORD || 'changeme');
const CAST_VOTES = args.includes('--vote');

const FIRST_NAMES = [
  'Alice', 'Bob', 'Charlie', 'Daniel', 'Ethan', 'Fiona', 'George', 'Hannah', 'Isaac', 'Jack',
  'Katherine', 'Liam', 'Mia', 'Noah', 'Olivia', 'Peter', 'Rachel', 'Samuel', 'Thomas', 'Emily',
  'Victoria', 'William', 'Zoe', 'Andrew', 'Benjamin', 'Chloe', 'David', 'Emma', 'Frank', 'Grace',
];

function nameFor(i) {
  return FIRST_NAMES[i] ?? `Voter ${i + 1}`;
}

async function hostLogin() {
  const res = await fetch(`${BASE}/api/host-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`host login failed: ${res.status} ${await res.text()}`);
  return (await res.json()).token;
}

async function createRoom(token, name) {
  const res = await fetch(`${BASE}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-host-token': token },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`create room failed: ${res.status} ${await res.text()}`);
  return (await res.json()).id;
}

function join(name, roomId, pid, extra = {}) {
  return new Promise((resolve, reject) => {
    const s = io(BASE, { transports: ['websocket'] });
    s.on('connect', () => s.emit('join', { roomId, name, participantId: pid, ...extra }));
    s.on('joined', () => resolve(s));
    s.on('join-error', (err) => reject(new Error(err.error)));
    s.on('connect_error', (err) => reject(err));
  });
}

const RCI = ['1', '2', '3', '4', '5'];
const EFFORT = ['1', '2', '3', '5', '8', '13'];

const hostToken = await hostLogin();
const roomId = await createRoom(hostToken, `Load Test - ${count} voters`);

const host = await join('Scheduler', roomId, 'host-bot', { hostToken });
host.emit('add-item', { name: 'PRB-6' });
host.emit('add-item', { name: 'PRB-5' });
await new Promise((r) => setTimeout(r, 150));

const sockets = [];
for (let i = 0; i < count; i++) {
  sockets.push(await join(nameFor(i), roomId, `bot-${i}`));
}

if (CAST_VOTES) {
  sockets.forEach((s, i) => {
    s.emit('vote', { pollType: 'rci', value: RCI[i % RCI.length] });
    s.emit('vote', { pollType: 'effort', value: EFFORT[i % EFFORT.length] });
  });
}

console.log(`ROOM_ID=${roomId}`);
console.log(`JOIN_LINK (dev, Vite client)=${BASE.replace(/:\d+$/, ':5173')}/?room=${roomId}`);
console.log(`JOIN_LINK (single-process/prod)=${BASE}/?room=${roomId}`);
console.log(`${count} voters + 1 host connected${CAST_VOTES ? ' (all voted)' : ''}.`);
console.log('Leaving sockets open — press Ctrl+C to disconnect everyone.');

// Keep the process (and its sockets) alive.
setInterval(() => { }, 60000);
