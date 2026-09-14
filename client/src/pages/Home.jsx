import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { hostLogin, createRoom, roomExists } from '../lib/api.js';
import { getHostToken, setHostToken, clearHostToken, getName, setName } from '../lib/storage.js';
import { Logo } from '../components/Icons.jsx';
import PollConfigField from '../components/PollConfigField.jsx';
import Switch from '../components/Switch.jsx';
import { CUSTOM_OPTION_ID, VOTING_PRESETS, parseCustomValues, withUnknownCard } from '../lib/votingSystems.js';
import jiraLogo from '../assets/icons/jira.png';
import binocularsLogo from '../assets/icons/binoculars.png';
import downloadLogo from '../assets/icons/download.png';

const FEATURES = [
  { icon: jiraLogo, title: 'Synced with Jira', description: 'Pull sprint items in and push final RCI & Effort values back out.' },
  { icon: binocularsLogo, title: 'Observer mode', description: 'Stakeholders can watch a session without casting a vote.' },
  { icon: downloadLogo, title: 'Export results', description: 'Download every estimate for the sprint as an Excel workbook.' },
];

const TRAFFIC_LIGHTS = ['#ff5f57', '#febc2e', '#28c840'];

// Cross-fades its children whenever fadeKey changes; skipped under prefers-reduced-motion.
function FadeSwap({ fadeKey, children }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [fadeKey]);

  return (
    <div className={`transition-opacity duration-200 ease-out motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const linkedRoom = searchParams.get('room') || '';

  const [tab, setTab] = useState('join');
  const [roomCode, setRoomCode] = useState(linkedRoom);
  const [guestName, setGuestName] = useState(getName());
  const [joinError, setJoinError] = useState('');

  const [hostToken, setHostTokenState] = useState(getHostToken());
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [newRoomName, setNewRoomName] = useState('Sprint Planning');
  const [creating, setCreating] = useState(false);

  const [rciEnabled, setRciEnabled] = useState(true);
  const [rciPreset, setRciPreset] = useState('rci-scale');
  const [rciCustomName, setRciCustomName] = useState('');
  const [rciCustomValues, setRciCustomValues] = useState('');

  const [effortEnabled, setEffortEnabled] = useState(true);
  const [effortPreset, setEffortPreset] = useState('fibonacci');
  const [effortCustomName, setEffortCustomName] = useState('');
  const [effortCustomValues, setEffortCustomValues] = useState('');

  const [optionsOpen, setOptionsOpen] = useState(true);
  const [itemPrefix, setItemPrefix] = useState('');
  const [hostCanVote, setHostCanVote] = useState(false);

  useEffect(() => {
    if (linkedRoom) {
      setRoomCode(linkedRoom);
      setTab('join');
    }
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

  function buildPollConfig(enabled, presetId, customName, customValues, defaultLabel) {
    if (!enabled) return { enabled: false };
    if (presetId === CUSTOM_OPTION_ID) {
      return {
        enabled: true,
        label: customName.trim() || defaultLabel,
        deck: withUnknownCard(parseCustomValues(customValues)),
      };
    }
    const preset = VOTING_PRESETS.find((p) => p.id === presetId);
    return { enabled: true, label: defaultLabel, deck: withUnknownCard(preset?.values || []) };
  }

  async function handleCreateRoom(e) {
    e.preventDefault();
    if (!hostToken || !newRoomName.trim()) return;
    if (!rciEnabled && !effortEnabled) {
      setLoginError('Enable at least one voting table.');
      return;
    }
    if (rciEnabled && rciPreset === CUSTOM_OPTION_ID && parseCustomValues(rciCustomValues).length < 2) {
      setLoginError('RCI custom system needs at least two values.');
      return;
    }
    if (effortEnabled && effortPreset === CUSTOM_OPTION_ID && parseCustomValues(effortCustomValues).length < 2) {
      setLoginError('Effort custom system needs at least two values.');
      return;
    }

    setLoginError('');
    setCreating(true);
    try {
      const config = {
        itemPrefix: itemPrefix.trim(),
        hostCanVote,
        polls: {
          rci: buildPollConfig(rciEnabled, rciPreset, rciCustomName, rciCustomValues, 'Requirement Clarity Index'),
          effort: buildPollConfig(effortEnabled, effortPreset, effortCustomName, effortCustomValues, 'Effort'),
        },
      };
      const room = await createRoom(hostToken, newRoomName.trim(), config);
      navigate(`/room/${room.id}`);
    } catch (err) {
      if (err.message.includes('Host login')) handleLogout();
      setLoginError(err.message);
    } finally {
      setCreating(false);
    }
  }

  const segmentBase = 'flex-1 text-sm font-medium rounded-md py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1';
  const inputBase = 'border border-slate-200 rounded-lg px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus:border-violet-400';

  const formKey = tab === 'join' ? 'join' : hostToken ? 'host-create' : 'host-login';
  const formContentRef = useRef(null);
  const [formHeight, setFormHeight] = useState(null);

  useLayoutEffect(() => {
    const el = formContentRef.current;
    if (!el) return undefined;
    const update = () => setFormHeight(el.scrollHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [formKey]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo size={44} />
          <h1 className="text-2xl font-bold text-slate-800">Open Scrum Poker</h1>
          <p className="text-slate-500 text-sm">Vote RCI &amp; Effort together, in real time.</p>
        </div>

        {/* macOS-style window */}
        <div className="w-full bg-white rounded-xl shadow-2xl border border-black/10 overflow-hidden">
          <div className="relative h-9 flex items-center px-3 bg-slate-100 border-b border-black/5">
            <div className="flex items-center gap-[7px]">
              {TRAFFIC_LIGHTS.map((color) => (
                <span key={color} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              ))}
            </div>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-500 pointer-events-none">
              {tab === 'join' ? 'Join Session' : 'Scheduler'}
            </span>
          </div>

          <div className="p-6 flex flex-col gap-4">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1" role="tablist" aria-label="Choose how to continue">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'join'}
                onClick={() => setTab('join')}
                className={[segmentBase, tab === 'join' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'].join(' ')}
              >
                Join
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'host'}
                onClick={() => setTab('host')}
                className={[segmentBase, tab === 'host' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'].join(' ')}
              >
                Host
              </button>
            </div>

            <div
              className="overflow-hidden transition-[height] duration-300 ease-in-out motion-reduce:transition-none"
              style={{ height: formHeight != null ? `${formHeight}px` : 'auto' }}
            >
              <div ref={formContentRef}>
                <FadeSwap fadeKey={formKey}>
                  {tab === 'join' ? (
                    <form onSubmit={handleJoin} className="flex flex-col gap-3">
                      <input
                        className={inputBase}
                        placeholder="Session code"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value)}
                      />
                      <input
                        className={inputBase}
                        placeholder="Your name"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                      />
                      {joinError && <p className="text-sm text-red-500">{joinError}</p>}
                      <button
                        type="submit"
                        className="mt-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                      >
                        Join
                      </button>
                    </form>
                  ) : !hostToken ? (
                    <form onSubmit={handleHostLogin} className="flex flex-col gap-3">
                      <input
                        type="password"
                        className={inputBase}
                        placeholder="Host password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      {loginError && <p className="text-sm text-red-500">{loginError}</p>}
                      <button
                        type="submit"
                        className="bg-slate-800 hover:bg-slate-900 text-white rounded-lg py-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                      >
                        Log in
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleCreateRoom} className="flex flex-col gap-3">
                      <p className="text-sm text-emerald-600">Logged in as scheduler</p>
                      <input
                        className={inputBase}
                        placeholder="Sprint name"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                      />

                      <PollConfigField
                        label="Requirement Clarity Index (RCI)"
                        enabled={rciEnabled}
                        onToggle={setRciEnabled}
                        presetId={rciPreset}
                        onPresetChange={setRciPreset}
                        customName={rciCustomName}
                        onCustomNameChange={setRciCustomName}
                        customValues={rciCustomValues}
                        onCustomValuesChange={setRciCustomValues}
                      />
                      <PollConfigField
                        label="Effort"
                        enabled={effortEnabled}
                        onToggle={setEffortEnabled}
                        presetId={effortPreset}
                        onPresetChange={setEffortPreset}
                        customName={effortCustomName}
                        onCustomNameChange={setEffortCustomName}
                        customValues={effortCustomValues}
                        onCustomValuesChange={setEffortCustomValues}
                      />

                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOptionsOpen((v) => !v)}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset"
                        >
                          Options
                          <span className={`transition-transform ${optionsOpen ? 'rotate-180' : ''}`}>⌄</span>
                        </button>
                        {optionsOpen && (
                          <div className="px-3 pb-3 pt-1 border-t border-slate-100 flex flex-col gap-3">
                            <div>
                              <label className="text-xs text-slate-500">Item prefix (optional)</label>
                              <input
                                value={itemPrefix}
                                onChange={(e) => setItemPrefix(e.target.value)}
                                placeholder="e.g. PRB-"
                                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus:border-violet-400"
                              />
                              <p className="text-xs text-slate-400 mt-1">
                                Prefixed to the number a host types when adding an item. Leave blank to type full issue keys.
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm text-slate-700">Host can vote</p>
                                <p className="text-xs text-slate-400">Lets the host cast votes like a regular participant.</p>
                              </div>
                              <Switch checked={hostCanVote} onChange={setHostCanVote} label="Host can vote" />
                            </div>
                          </div>
                        )}
                      </div>

                      {loginError && <p className="text-sm text-red-500">{loginError}</p>}
                      <button
                        type="submit"
                        disabled={creating}
                        className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg py-2 font-medium transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
                      >
                        {creating ? 'Creating…' : 'Create new session'}
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="text-sm text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded"
                      >
                        Log out
                      </button>
                    </form>
                  )}
                </FadeSwap>
              </div>
            </div>
          </div>
        </div>

        {/* Grouped feature list */}
        <div className="w-full bg-white rounded-xl shadow-sm border border-black/5 divide-y divide-slate-100 overflow-hidden">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-center gap-3 px-4 py-3">
              <span className="shrink-0 w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                <img src={f.icon} alt="" className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700">{f.title}</p>
                <p className="text-xs text-slate-500 truncate">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
