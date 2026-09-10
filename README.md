# Open Scrum Poker

Real-time scrum poker for sprint planning with two simultaneous votes per item — **RCI** (1-5) and **Effort** (Fibonacci) — no account needed for participants, no external database.

## Stack

- **Server**: Node.js + Express + Socket.IO, all state kept in memory (`server/store.js`) — restarting the process clears every room.
- **Client**: React + Vite + Tailwind CSS v4, talks to the server over REST (`/api/*`) and WebSockets.
- **Export**: `xlsx` (SheetJS) generates the Item/RCI/Effort workbook on demand, server-side, from the in-memory room state.
- Single deployable process: in production the Express server also serves the built React app, so there's nothing else to host or configure.

## Local development

```bash
npm install
npm --prefix client install
npm run dev
```

This runs the Express/Socket.IO server (port 3001) and the Vite dev server (port 5173, proxying `/api` and `/socket.io` to 3001) together. Open http://localhost:5173.

Default host/scheduler password is `changeme` — override with the `HOST_PASSWORD` env var (see below).

## Production

```bash
npm run build   # builds client/dist
npm start       # serves API + built client from one process, on $PORT (default 3001)
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `HOST_PASSWORD` | `changeme` | Shared password for scheduler/host login. **Set this before deploying.** |
| `PORT` | `3001` | Port the single Node process listens on. |

## How it works

- A **scheduler** logs in with the host password on the home page, then creates a session (sprint). They land in the room as host.
- The host adds sprint item names one at a time (or ahead of time) in the **Sprint items** panel, and steps through them with Prev/Next.
- The host clicks **Invite Others** to copy a shareable join link (`/?room=<code>`). Guests open it, type a name (no account), and vote — no login required.
- For the active item, participants pick a card on the **RCI** deck and the **Effort** deck independently; both polls run at the same time.
- The host reveals each poll when ready, then confirms a **final value** (clicking one of the revealed values, or typing a custom one) — that's what gets exported.
- Once finals are set for the items you care about, the host clicks **Download Excel** to get a workbook with Item / RCI / Effort columns.

## Testing with simulated voters

`scripts/populate.mjs` spins up a room with N simulated voters (real socket connections) against a running server, so you can check the UI at scale without opening N browser tabs:

```bash
npm run populate -- 15          # 15 simulated voters + 1 host
npm run populate -- 40 --vote   # 40 voters, all cast RCI/Effort votes immediately
npm run populate -- 8 --url http://10.10.46.117:3001   # target a different host/port
```

It logs in as host (using `HOST_PASSWORD`, default `changeme`), creates a room, adds two sample items (`PRB-1001`, `PRB-1002`), connects the voters, and prints join links for both the dev setup (`:5173`) and a single-process/production deployment. The sockets stay connected — and the participants stay "online" in the room — until you stop the process (Ctrl+C).

## Notes / limitations

- All state (rooms, items, votes) is in memory only — a server restart or redeploy clears everything. This is intentional per the "no remote DB" requirement; if you need durability across restarts, swap `server/store.js` for a persistent store.
- Host sessions are simple bearer tokens issued on password login, kept in memory and in the browser's `localStorage` — there's no per-scheduler account system, just one shared password.
