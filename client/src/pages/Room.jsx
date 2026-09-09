import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { socket } from '../lib/socket.js';
import { exportUrl } from '../lib/api.js';
import { getHostToken, getName, setName, getParticipantId, setParticipantId } from '../lib/storage.js';
import Sidebar from '../components/Sidebar.jsx';
import ItemsPanel from '../components/ItemsPanel.jsx';
import ItemHeader from '../components/ItemHeader.jsx';
import PollPanel from '../components/PollPanel.jsx';
import { Logo, LinkIcon, ListIcon, DownloadIcon, PowerIcon } from '../components/Icons.jsx';

const RCI_DECK = ['1', '2', '3', '4', '5', '?'];
const EFFORT_DECK = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?'];

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [needsName, setNeedsName] = useState(!getName());
  const [nameDraft, setNameDraft] = useState(getName());
  const [asObserver, setAsObserver] = useState(false);

  const [status, setStatus] = useState('idle'); // idle | connecting | in-room | error
  const [errorMsg, setErrorMsg] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [room, setRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [manageItems, setManageItems] = useState(false);
  const hostToken = useRef(getHostToken());

  useEffect(() => {
    if (needsName) return;
    setStatus('connecting');
    socket.connect();

    const pid = getParticipantId(roomId) || nanoid(10);
    setParticipantId(roomId, pid);

    function doJoin() {
      socket.emit('join', {
        roomId,
        name: getName(),
        participantId: pid,
        isObserver: asObserver,
        hostToken: hostToken.current,
      });
    }

    socket.on('connect', doJoin);
    socket.on('joined', ({ isHost: host }) => {
      setIsHost(host);
      setStatus('in-room');
    });
    socket.on('join-error', ({ error }) => {
      setErrorMsg(error);
      setStatus('error');
    });
    socket.on('room-state', (state) => setRoom(state));
    socket.on('session-ended', () => {
      socket.disconnect();
      navigate('/');
    });

    if (socket.connected) doJoin();

    return () => {
      socket.off('connect', doJoin);
      socket.off('joined');
      socket.off('join-error');
      socket.off('room-state');
      socket.off('session-ended');
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsName, roomId]);

  function handleEnter(e) {
    e.preventDefault();
    if (!nameDraft.trim()) return;
    setName(nameDraft.trim());
    setNeedsName(false);
  }

  function copyShareLink() {
    const url = `${window.location.origin}/?room=${roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function downloadExcel() {
    window.open(exportUrl(roomId, hostToken.current), '_blank');
  }

  function endSession() {
    if (!window.confirm('End this session for everyone? This cannot be undone.')) return;
    socket.emit('end-session');
  }

  if (needsName) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <form onSubmit={handleEnter} className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-sm flex flex-col gap-3">
          <h2 className="font-semibold text-lg text-slate-700">Join session</h2>
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Your name"
            className="border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-400"
          />
          {hostToken.current ? (
            <p className="text-sm text-slate-400">You're joining as the session host and won't vote.</p>
          ) : (
            <label className="flex items-center gap-2 text-sm text-slate-500">
              <input type="checkbox" checked={asObserver} onChange={(e) => setAsObserver(e.target.checked)} />
              Join as observer (won't vote)
            </label>
          )}
          <button type="submit" className="bg-violet-600 text-white rounded-lg py-2 font-medium">
            Continue
          </button>
        </form>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-red-500 font-medium">{errorMsg}</p>
          <a href="/" className="text-violet-600 underline mt-2 inline-block">Back to home</a>
        </div>
      </div>
    );
  }

  if (status !== 'in-room' || !room) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Connecting…</div>;
  }

  const canVote = !isSelfObserver(room);

  return (
    <div className="min-h-screen p-4 md:p-6">
      <header className="flex items-center justify-between bg-white rounded-2xl shadow-sm px-5 py-3 mb-4 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Logo />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-1">
              Open Scrum Poker
            </p>
            <h1 className="font-bold text-slate-800 truncate leading-tight">{room.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={copyShareLink}
            className="flex items-center gap-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-2"
          >
            <LinkIcon /> {copied ? 'Copied!' : 'Invite Others'}
          </button>
          {isHost && (
            <button
              onClick={() => setManageItems((v) => !v)}
              className="flex items-center gap-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-2"
            >
              <ListIcon /> {manageItems ? 'Close Item Setup' : 'Manage Items'}
            </button>
          )}
          {isHost && (
            <button
              onClick={downloadExcel}
              className="flex items-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-2"
            >
              <DownloadIcon /> Download Excel
            </button>
          )}
          {isHost && (
            <button
              onClick={endSession}
              className="flex items-center gap-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg px-3 py-2"
            >
              <PowerIcon /> End Session
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4">
        <Sidebar participants={room.participants} currentItem={room.currentItem} />

        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {isHost && manageItems ? (
            <ItemsPanel
              items={room.items}
              currentItemIndex={room.currentItemIndex}
              isHost={isHost}
              onAdd={(name) => socket.emit('add-item', { name })}
              onSelect={(index) => socket.emit('set-current-item', { index })}
              onRemove={(itemId) => socket.emit('remove-item', { itemId })}
              onPrev={() => socket.emit('set-current-item', { index: room.currentItemIndex - 1 })}
              onNext={() => socket.emit('set-current-item', { index: room.currentItemIndex + 1 })}
            />
          ) : (
            <ItemHeader
              item={room.currentItem}
              index={room.currentItemIndex}
              total={room.items.length}
              isHost={isHost}
              onPrev={() => socket.emit('set-current-item', { index: room.currentItemIndex - 1 })}
              onNext={() => socket.emit('set-current-item', { index: room.currentItemIndex + 1 })}
            />
          )}

          <div className="flex flex-col md:flex-row gap-4">
            <PollPanel
              title="RCI"
              deck={RCI_DECK}
              poll={room.currentItem?.rci}
              participants={room.participants}
              isHost={isHost}
              canVote={canVote && !!room.currentItem}
              onVote={(value) => socket.emit('vote', { pollType: 'rci', value })}
              onReveal={() => socket.emit('reveal', { pollType: 'rci' })}
              onReset={() => socket.emit('reset-poll', { pollType: 'rci' })}
              onSetFinal={(value) => socket.emit('set-final', { pollType: 'rci', value })}
            />
            <PollPanel
              title="Effort"
              deck={EFFORT_DECK}
              poll={room.currentItem?.effort}
              participants={room.participants}
              isHost={isHost}
              canVote={canVote && !!room.currentItem}
              onVote={(value) => socket.emit('vote', { pollType: 'effort', value })}
              onReveal={() => socket.emit('reveal', { pollType: 'effort' })}
              onReset={() => socket.emit('reset-poll', { pollType: 'effort' })}
              onSetFinal={(value) => socket.emit('set-final', { pollType: 'effort', value })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function isSelfObserver(room) {
  const pid = getParticipantId(room.id);
  const me = room.participants.find((p) => p.id === pid);
  return !!me?.isObserver;
}
