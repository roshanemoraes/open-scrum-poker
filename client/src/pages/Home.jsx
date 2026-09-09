import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { hostLogin, createRoom, roomExists } from '../lib/api.js';
import { getHostToken, setHostToken, clearHostToken, getName, setName } from '../lib/storage.js';

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linkedRoom = searchParams.get('room') || '';

  const [roomCode, setRoomCode] = useState(linkedRoom);
  const [guestName, setGuestName] = useState(getName());
  const [joinError, setJoinError] = useState('');

  const [hostToken, setHostTokenState] = useState(getHostToken());
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [newRoomName, setNewRoomName] = useState('Sprint Planning');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (linkedRoom) setRoomCode(linkedRoom);
  }, [linkedRoom]);

  async function handleJoin(e) {
    e.preventDefault();
    setJoinError('');
    if (!roomCode.trim() || !guestName.trim()) return;
    const exists = await roomExists(roomCode.trim());
    if (!exists) {
      setJoinError('No session found with that code.');
      return;
    }
    setName(guestName.trim());
    navigate(`/room/${roomCode.trim()}`);
  }

  async function handleHostLogin(e) {
    e.preventDefault();
    setLoginError('');
    try {
      const { token } = await hostLogin(password);
      setHostToken(token);
      setHostTokenState(token);
      setPassword('');
    } catch (err) {
      setLoginError(err.message);
    }
  }

  function handleLogout() {
    clearHostToken();
    setHostTokenState(null);
  }

  async function handleCreateRoom(e) {
    e.preventDefault();
    if (!hostToken || !newRoomName.trim()) return;
    setCreating(true);
    try {
      const room = await createRoom(hostToken, newRoomName.trim());
      navigate(`/room/${room.id}`);
    } catch (err) {
      if (err.message.includes('Host login')) handleLogout();
      setLoginError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-3xl grid gap-6 md:grid-cols-2">
        <div className="md:col-span-2 text-center mb-2">
          <h1 className="text-3xl font-bold text-slate-800">Open Scrum Poker</h1>
          <p className="text-slate-500 mt-1">Vote RCI &amp; Effort together, in real time.</p>
        </div>

        <form onSubmit={handleJoin} className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-3">
          <h2 className="font-semibold text-slate-700 text-lg">Join a session</h2>
          <input
            className="border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-400"
            placeholder="Session code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
          />
          <input
            className="border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-400"
            placeholder="Your name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
          />
          {joinError && <p className="text-sm text-red-500">{joinError}</p>}
          <button
            type="submit"
            className="mt-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg py-2 font-medium transition"
          >
            Join
          </button>
        </form>

        <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col gap-3">
          <h2 className="font-semibold text-slate-700 text-lg">Scheduler login</h2>
          {!hostToken ? (
            <form onSubmit={handleHostLogin} className="flex flex-col gap-3">
              <input
                type="password"
                className="border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-400"
                placeholder="Host password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {loginError && <p className="text-sm text-red-500">{loginError}</p>}
              <button
                type="submit"
                className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg py-2 font-medium transition"
              >
                Log in
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateRoom} className="flex flex-col gap-3">
              <p className="text-sm text-emerald-600">Logged in as scheduler</p>
              <input
                className="border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-400"
                placeholder="Sprint name"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
              />
              {loginError && <p className="text-sm text-red-500">{loginError}</p>}
              <button
                type="submit"
                disabled={creating}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg py-2 font-medium transition disabled:opacity-60"
              >
                {creating ? 'Creating…' : 'Create new session'}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm text-slate-400 hover:text-slate-600"
              >
                Log out
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
