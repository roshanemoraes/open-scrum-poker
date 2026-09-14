import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { socket } from '../lib/socket.js';
import { exportUrl } from '../lib/api.js';
import {
  getHostToken,
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
import AvatarPicker from '../components/AvatarPicker.jsx';
import SettingsMenu from '../components/SettingsMenu.jsx';
import Toast from '../components/Toast.jsx';
import { Logo } from '../components/Icons.jsx';
import addFriendLogo from '../assets/add-friend.png';
import manageItemsLogo from '../assets/manageItems.png';
import downloadLogo from '../assets/download.png';
import powerLogo from '../assets/power-switch.png';

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

  const canVote = !isSelfObserver(room);
  const pollTypes = Object.keys(room.config?.polls || {});
  const bothFinalsSet = !room.currentItem || pollTypes.every((type) => room.currentItem[type]?.final != null);

  return (
    <div className="min-h-screen p-4 md:p-6">
      {toast && (
        <div className="fixed top-4 right-4 z-[1000]">
          <Toast type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast(null)} />
        </div>
      )}

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
            <img src={addFriendLogo} alt="Invite" className="w-5 h-5 shrink-0" /> {copied ? 'Copied!' : 'Invite Others'}
          </button>
          {isHost && (
            <button
              onClick={() => setManageItems((v) => !v)}
              className="flex items-center gap-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg px-3 py-2"
            >
              <img src={manageItemsLogo} alt="Manage Items" className="w-5 h-5 shrink-0" /> {manageItems ? 'Close Item Setup' : 'Manage Items'}
            </button>
          )}
          {isHost && (
            <SettingsMenu
              items={[
                { label: 'Download Excel', icon: <img src={downloadLogo} alt="Download" className="w-4 h-4" />, onClick: downloadExcel },
              ]}
            />
          )}
          {isHost && (
            <button
              onClick={endSession}
              className="flex items-center gap-1.5 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg px-3 py-2"
            >
              <img src={powerLogo} alt="End Session" className="w-5 h-5 shrink-0" /> End Session
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4">
        <Sidebar participants={room.participants} currentItem={room.currentItem} selfId={getParticipantId(room.id)} />

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
              canNavigate={bothFinalsSet}
            />
          )}

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
