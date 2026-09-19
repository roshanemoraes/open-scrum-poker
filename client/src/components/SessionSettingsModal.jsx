import { useEffect, useState } from 'react';
import PollConfigField from './PollConfigField.jsx';
import Switch from './Switch.jsx';
import { CUSTOM_OPTION_ID, VOTING_PRESETS, parseCustomValues, withUnknownCard } from '../lib/votingSystems.js';

// Exact palette/typography from ManageSession.dc.html, reused here for visual
// consistency with the rest of the Manage session card.
const SPACE_GROTESK = { fontFamily: "'Space Grotesk', sans-serif" };
const PLEX_SANS = { fontFamily: "'IBM Plex Sans', sans-serif" };

// Room config only stores the resolved {enabled, label, deck}, not which preset (or
// custom system) produced it — so reconstruct the form state by matching the deck
// against the known presets, falling back to "custom" when nothing matches.
function pollToFormState(poll, fallbackPreset) {
  if (!poll?.enabled) {
    return { enabled: false, preset: fallbackPreset, customName: '', customValues: '' };
  }
  const values = poll.deck.filter((v) => v !== '?');
  const matched = VOTING_PRESETS.find(
    (p) => p.values.length === values.length && p.values.every((v, i) => v === values[i])
  );
  if (matched) return { enabled: true, preset: matched.id, customName: '', customValues: '' };
  return { enabled: true, preset: CUSTOM_OPTION_ID, customName: poll.label || '', customValues: values.join(', ') };
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

export default function SessionSettingsModal({ open, config, onClose, onSave }) {
  const [rciEnabled, setRciEnabled] = useState(true);
  const [rciPreset, setRciPreset] = useState('rci-scale');
  const [rciCustomName, setRciCustomName] = useState('');
  const [rciCustomValues, setRciCustomValues] = useState('');

  const [effortEnabled, setEffortEnabled] = useState(true);
  const [effortPreset, setEffortPreset] = useState('fibonacci');
  const [effortCustomName, setEffortCustomName] = useState('');
  const [effortCustomValues, setEffortCustomValues] = useState('');

  const [itemPrefix, setItemPrefix] = useState('');
  const [hostCanVote, setHostCanVote] = useState(false);
  const [error, setError] = useState('');

  // Re-seed the form from the room's current config every time the modal opens.
  useEffect(() => {
    if (!open) return;
    const rci = pollToFormState(config?.polls?.rci, 'rci-scale');
    const effort = pollToFormState(config?.polls?.effort, 'fibonacci');
    setRciEnabled(rci.enabled);
    setRciPreset(rci.preset);
    setRciCustomName(rci.customName);
    setRciCustomValues(rci.customValues);
    setEffortEnabled(effort.enabled);
    setEffortPreset(effort.preset);
    setEffortCustomName(effort.customName);
    setEffortCustomValues(effort.customValues);
    setItemPrefix(config?.itemPrefix || '');
    setHostCanVote(!!config?.hostCanVote);
    setError('');
  }, [open, config]);

  if (!open) return null;

  function handleSave(e) {
    e.preventDefault();
    if (!rciEnabled && !effortEnabled) {
      setError('Enable at least one voting table.');
      return;
    }
    if (rciEnabled && rciPreset === CUSTOM_OPTION_ID && parseCustomValues(rciCustomValues).length < 2) {
      setError('RCI custom system needs at least two values.');
      return;
    }
    if (effortEnabled && effortPreset === CUSTOM_OPTION_ID && parseCustomValues(effortCustomValues).length < 2) {
      setError('Effort custom system needs at least two values.');
      return;
    }

    onSave({
      itemPrefix: itemPrefix.trim(),
      hostCanVote,
      polls: {
        rci: buildPollConfig(rciEnabled, rciPreset, rciCustomName, rciCustomValues, 'Requirement Clarity Index'),
        effort: buildPollConfig(effortEnabled, effortPreset, effortCustomName, effortCustomValues, 'Effort'),
      },
    });
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white border border-[#E4E1F2] rounded-[20px] shadow-[0_12px_32px_rgba(27,29,41,0.14),0_1px_2px_rgba(27,29,41,0.06)] w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={PLEX_SANS}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E4E1F2]">
          <h2 className="text-[18px] font-bold text-[#1B1D29]" style={SPACE_GROTESK}>Session settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full hover:bg-[#F5F4FB] flex items-center justify-center text-[#6E6B85] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="#6E6B85" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-3 p-6">
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

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-[13.5px] font-semibold text-[#4A4763] px-[14px] py-2 rounded-[9px] hover:bg-[#F5F4FB] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-[13.5px] font-semibold bg-[#5B4FE8] hover:bg-[#4038B8] text-white px-[18px] py-2 rounded-[9px] transition-colors"
            >
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
