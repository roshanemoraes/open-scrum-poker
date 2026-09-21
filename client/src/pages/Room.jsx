import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { socket } from '../lib/socket.js';
import { exportUrl } from '../lib/api.js';
import {
  getHostToken,
  getHostEmail,
  clearHostToken,
  clearHostEmail,
  getName,
  setName,
  getParticipantId,
  setParticipantId,
  getAvatarId,
  setAvatarId,
} from '../lib/storage.js';
import Sidebar from '../components/Sidebar.jsx';
import ItemsPanel from '../components/ItemsPanel.jsx';
import ItemHeader from '../components/ItemHeader.jsx';
import PollPanel from '../components/PollPanel.jsx';
import Avatar from '../components/avatar/Avatar.jsx';
import AvatarPicker from '../components/avatar/AvatarPicker.jsx';
import Toast from '../components/Toast.jsx';
import UserMenu from '../components/UserMenu.jsx';
import SessionSettingsModal from '../components/SessionSettingsModal.jsx';
import { Logo } from '../components/Icons.jsx';

// stroke="currentColor" so each icon always matches its own button's text color
// (see improve.txt #3) instead of carrying a hardcoded PNG tint.
function InviteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.5 13.5c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12.5 4.5v4M10.5 6.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ManageSessionIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 6.5v7" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

// Overlapping avatar stack showing who's currently in the room, with a "+N" bubble
// for anyone past the first few.
function ParticipantStack({ participants }) {
  if (participants.length === 0) return null;
  const MAX_SHOWN = 3;
  const shown = participants.slice(0, MAX_SHOWN);
  const extra = participants.length - shown.length;

  return (
    <div className="flex items-center">
      {shown.map((p, i) => (
        <div key={p.id} className="rounded-full ring-2 ring-white" style={{ marginLeft: i === 0 ? 0 : -10 }}>
          <Avatar id={p.id} avatarId={p.avatarId} name={p.name} size={32} />
        </div>
      ))}
      {extra > 0 && (
        <div
          className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 text-xs font-semibold flex items-center justify-center ring-2 ring-white"
          style={{ marginLeft: -10 }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

export default function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [needsProfile, setNeedsProfile] = useState(!getName() || getAvatarId() == null);
  const [nameDraft, setNameDraft] = useState(getName());
  const [avatarDraft, setAvatarDraft] = useState(getAvatarId());
  const [asObserver, setAsObserver] = useState(false);

  const [status, setStatus] = useState('idle'); // idle | connecting | in-room | error
  const [errorMsg, setErrorMsg] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [room, setRoom] = useState(null);
  const [copied, setCopied] = useState(false);
  const [manageItems, setManageItems] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [addingItem, setAddingItem] = useState(false);
  const hostToken = useRef(getHostToken());
  const addItemQueue = useRef([]);

  useEffect(() => {
    if (needsProfile) return;
    setStatus('connecting');
    socket.connect();

    const pid = getParticipantId(roomId) || nanoid(10);
    setParticipantId(roomId, pid);

    function doJoin() {
      socket.emit('join', {
        roomId,
        name: getName(),
        participantId: pid,
        avatarId: getAvatarId(),
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
    socket.on('room-state', (state) => {
      setRoom(state);
      processAddItemQueue();
    });
    socket.on('session-ended', () => {
      socket.disconnect();
      navigate('/');
    });
    function showToast(next) {
      setToast(next);
      setTimeout(() => setToast((cur) => (cur === next ? null : cur)), 6000);
    }
    socket.on('jira-sync', (payload) => {
      const label = payload.pollType === 'rci' ? 'RCI' : 'Effort';
      showToast(
        payload.ok
          ? { type: 'success', title: 'Synced!', message: `${label} synced to ${payload.itemName} in Jira` }
          : { type: 'error', title: 'Sync failed', message: `${label} for ${payload.itemName}: ${payload.error}` }
      );
    });
    socket.on('add-item-error', ({ error }) => {
      showToast({ type: 'error', title: 'Error', message: error });
      processAddItemQueue();
    });

    function processAddItemQueue() {
      const next = addItemQueue.current.shift();
      if (next) {
        socket.emit('add-item', { name: next });
      } else {
        setAddingItem(false);
      }
    }

    if (socket.connected) doJoin();

    return () => {
      socket.off('connect', doJoin);
      socket.off('joined');
      socket.off('join-error');
      socket.off('room-state');
      socket.off('session-ended');
      socket.off('jira-sync');
      socket.off('add-item-error');
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsProfile, roomId]);

  function handleEnter(e) {
    e.preventDefault();
    if (!nameDraft.trim() || avatarDraft == null) return;
    setName(nameDraft.trim());
    setAvatarId(avatarDraft);
    setNeedsProfile(false);
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

  function handleSignOut() {
    socket.disconnect();
    clearHostToken();
    clearHostEmail();
    navigate('/');
  }

  function toggleObserver(next) {
    socket.emit('set-observer', { isObserver: next });
  }

  function saveSessionSettings(config) {
    socket.emit('update-config', { config });
    setSettingsOpen(false);
  }

  if (needsProfile) {
    const canContinue = !!nameDraft.trim() && avatarDraft != null;
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <form onSubmit={handleEnter} className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-md flex flex-col gap-5">
          <h2 className="font-bold text-xl text-slate-800">Create Your Profile</h2>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Choose a display name</label>
            <p className="text-xs text-slate-400 mb-2">This will be how other participants see you</p>
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Your name"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-violet-400"
            />
          </div>

          {hostToken.current ? (
            <p className="text-sm text-slate-400 -mt-2">You're joining as the session host and won't vote.</p>
          ) : (
            <label className="flex items-center gap-2 text-sm text-slate-500 -mt-2">
              <input type="checkbox" checked={asObserver} onChange={(e) => setAsObserver(e.target.checked)} />
              Join as observer (won't vote)
            </label>
          )}

          <AvatarPicker selectedId={avatarDraft} onSelect={setAvatarDraft} />

          <button
            type="submit"
            disabled={!canContinue}
            className="bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white rounded-lg py-2.5 font-medium"
          >
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

  const me = room.participants.find((p) => p.id === getParticipantId(room.id));
  const canVote = !me?.isObserver;
  const pollTypes = Object.keys(room.config?.polls || {});
  const bothFinalsSet = !room.currentItem || pollTypes.every((type) => room.currentItem[type]?.final != null);

  // Prefer the Atlassian identity (only ever set for a host who logged in that way);
  // everyone else — guests, and hosts on the plain password flow — shows their typed name.
  const myIdentity = (isHost && getHostEmail()) || getName();

  return (
    <div className="min-h-screen">
      {toast && (
        <div className="fixed top-4 right-4 z-[1000]">
          <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />
        </div>
      )}

      <SessionSettingsModal
        open={settingsOpen}
        config={room.config}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSessionSettings}
      />

      <header className="flex items-center justify-between bg-white shadow-sm px-4 md:px-6 py-3 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Logo />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-none mb-1">
              Open Scrum Poker
            </p>
            <h1 className="font-bold text-slate-800 truncate leading-tight">{room.name}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <ParticipantStack participants={room.participants} />
          <div className="w-px h-6 bg-slate-200" />
          <button onClick={copyShareLink} className="btn-primary">
            <InviteIcon /> {copied ? 'Copied!' : 'Invite others'}
          </button>
          {isHost && (
            <button
              onClick={() => setManageItems((v) => !v)}
              className="btn-secondary"
            >
              <ManageSessionIcon /> {manageItems ? 'Close session setup' : 'Manage session'}
            </button>
          )}
          <UserMenu
            name={getName() || myIdentity}
            email={isHost ? getHostEmail() : ''}
            isObserver={!!me?.isObserver}
            onToggleObserver={toggleObserver}
            showObserverToggle
            onSignOut={handleSignOut}
          />
        </div>
      </header>

      <div className="p-4 md:p-6 flex flex-col lg:flex-row gap-4">
        <Sidebar
          participants={room.participants}
          currentItem={room.currentItem}
          pollConfig={room.config?.polls}
          selfId={getParticipantId(room.id)}
        />

        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {isHost && manageItems ? (
            <ItemsPanel
              items={room.items}
              currentItemIndex={room.currentItemIndex}
              isHost={isHost}
              adding={addingItem}
              itemPrefix={room.config?.itemPrefix || ''}
              onAdd={(names) => {
                const list = Array.isArray(names) ? names : [names];
                if (list.length === 0) return;
                addItemQueue.current.push(...list);
                if (!addingItem) {
                  setAddingItem(true);
                  socket.emit('add-item', { name: addItemQueue.current.shift() });
                }
              }}
              onSelect={(index) => socket.emit('set-current-item', { index })}
              onRemove={(itemId) => socket.emit('remove-item', { itemId })}
              onPrev={() => socket.emit('set-current-item', { index: room.currentItemIndex - 1 })}
              onNext={() => socket.emit('set-current-item', { index: room.currentItemIndex + 1 })}
              onDownloadExcel={downloadExcel}
              onEndSession={endSession}
              onSettings={() => setSettingsOpen(true)}
              canNavigate={bothFinalsSet}
            />
          ) : (
            <ItemHeader
              item={room.currentItem}
              index={room.currentItemIndex}
              total={room.items.length}
              isHost={isHost}
              onPrev={() => socket.emit('set-current-item', { index: room.currentItemIndex - 1 })}
              onNext={() => socket.emit('set-current-item', { index: room.currentItemIndex + 1 })}
              onManageItems={() => setManageItems(true)}
              canNavigate={bothFinalsSet}
            />
          )}

          {room.currentItem && !manageItems && (
            <div className="flex flex-col md:flex-row gap-4">
              {pollTypes.map((type) => (
                <PollPanel
                  key={type}
                  title={room.config.polls[type].label}
                  deck={room.config.polls[type].deck}
                  poll={room.currentItem?.[type]}
                  participants={room.participants}
                  isHost={isHost}
                  canVote={canVote && !!room.currentItem}
                  onVote={(value) => socket.emit('vote', { pollType: type, value })}
                  onReveal={() => socket.emit('reveal', { pollType: type })}
                  onReset={() => socket.emit('reset-poll', { pollType: type })}
                  onSetFinal={(value) => socket.emit('set-final', { pollType: type, value })}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
